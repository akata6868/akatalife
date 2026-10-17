/**
 * Exact Minor-Unit (EUR Cents) Financial Arithmetic & German/Turkish Formatting.
 * Never uses floating-point addition/subtraction for financial totals.
 */

export type SupportedLocale = "de" | "tr";

/**
 * Formats integer EUR cents (e.g., 123456) into German or Turkish EUR string ("1.234,56 €").
 */
export function formatEurCents(
  amountCents: number,
  locale: SupportedLocale = "de"
): string {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`amountCents must be an integer, received: ${amountCents}`);
  }
  const intlLocale = locale === "tr" ? "tr-TR" : "de-DE";
  const sign = amountCents < 0 ? "-" : "";
  const absCents = Math.abs(amountCents);
  const euros = Math.floor(absCents / 100);
  const cents = absCents % 100;

  const formattedEuros = new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 0,
  }).format(euros);
  const formattedCents = String(cents).padStart(2, "0");

  return `${sign}${formattedEuros},${formattedCents} €`;
}

/**
 * Parses a German/Turkish or standard monetary string (e.g., "1.234,56", "49,90", "49.90", "100")
 * into exact integer cents without IEEE-754 floating-point drift.
 */
export function parseEurToCents(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      throw new Error("Invalid monetary number");
    }
    return Math.round(input * 100);
  }

  const raw = input.replace(/[€\s\u00A0]/g, "").trim();
  if (!raw) {
    throw new Error("Monetary input cannot be empty");
  }

  const isNegative = raw.startsWith("-");
  const unsigned = raw.replace(/^[+-]/, "");

  let normalized: string;
  if (unsigned.includes(",") && unsigned.includes(".")) {
    // e.g. "1.234,56" -> remove thousand dots, replace decimal comma
    normalized = unsigned.replace(/\./g, "").replace(",", ".");
  } else if (unsigned.includes(",")) {
    // e.g. "49,90"
    normalized = unsigned.replace(",", ".");
  } else {
    normalized = unsigned;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid monetary format: "${input}"`);
  }

  const [wholePart = "0", fracPart = ""] = normalized.split(".");
  const paddedFrac = (fracPart + "00").slice(0, 2);
  const totalCents =
    parseInt(wholePart, 10) * 100 + parseInt(paddedFrac, 10);

  return isNegative ? -totalCents : totalCents;
}

/**
 * Sums an array of integer cent values safely.
 */
export function sumCents(values: readonly number[]): number {
  let total = 0;
  for (const val of values) {
    if (!Number.isInteger(val)) {
      throw new Error(`Non-integer cent value encountered: ${val}`);
    }
    total += val;
  }
  return total;
}

/**
 * Calculates monthly equivalent cost in cents for a contract based on billing frequency.
 */
export function calculateMonthlyEquivalentCents(
  amountCents: number,
  frequency: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | "ONE_TIME"
): number {
  switch (frequency) {
    case "MONTHLY":
      return amountCents;
    case "QUARTERLY":
      return Math.round(amountCents / 3);
    case "SEMI_ANNUAL":
      return Math.round(amountCents / 6);
    case "ANNUAL":
      return Math.round(amountCents / 12);
    case "ONE_TIME":
      return 0;
  }
}

/**
 * Calculates budget summary in exact cents.
 */
export function calculateBudgetSummary(params: {
  budgetLimitCents: number;
  recordedExpenseCents: number;
  confirmedExpenseCents: number;
  plannedExpenseCents: number;
}) {
  const actualSpentCents = sumCents([
    params.recordedExpenseCents,
    params.confirmedExpenseCents,
  ]);
  const remainingCents = params.budgetLimitCents - actualSpentCents;
  const projectedRemainingCents =
    remainingCents - params.plannedExpenseCents;
  const utilizationPercent =
    params.budgetLimitCents > 0
      ? Math.min(
          999,
          Math.round((actualSpentCents * 100) / params.budgetLimitCents)
        )
      : 0;

  return {
    budgetLimitCents: params.budgetLimitCents,
    actualSpentCents,
    plannedExpenseCents: params.plannedExpenseCents,
    remainingCents,
    projectedRemainingCents,
    utilizationPercent,
    isOverBudget: remainingCents < 0,
  };
}

/**
 * Computes paid so far and remaining payments for a contract,
 * prioritizing explicit values entered by Hermes Agent or the user,
 * with automatic date-based calculation as fallback.
 */
export function calculateContractPaymentBreakdown(params: {
  amountCents: number;
  billingFrequency: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | "ONE_TIME";
  startDate: Date | string;
  renewalDate?: Date | string | null;
  minimumTermMonths?: number | null;
  status: string;
  paidAmountCents?: number | null;
  remainingAmountCents?: number | null;
  paidInstallments?: number | null;
  remainingInstallments?: number | null;
  referenceNow?: Date;
}) {
  const now = params.referenceNow ?? new Date();
  const start =
    params.startDate instanceof Date
      ? params.startDate
      : new Date(params.startDate);
  const renewal = params.renewalDate
    ? params.renewalDate instanceof Date
      ? params.renewalDate
      : new Date(params.renewalDate)
    : null;

  const monthlyCents =
    params.billingFrequency === "ONE_TIME"
      ? params.amountCents
      : calculateMonthlyEquivalentCents(
          params.amountCents,
          params.billingFrequency
        );

  let elapsedMonths = 0;
  if (!Number.isNaN(start.getTime()) && start.getTime() <= now.getTime()) {
    const yearDiff = now.getUTCFullYear() - start.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - start.getUTCMonth();
    const dayBonus = now.getUTCDate() >= start.getUTCDate() ? 1 : 0;
    elapsedMonths = Math.max(0, yearDiff * 12 + monthDiff + dayBonus);
  }

  let totalMonths =
    typeof params.minimumTermMonths === "number" && params.minimumTermMonths > 0
      ? params.minimumTermMonths
      : 0;

  if (totalMonths === 0 && renewal && !Number.isNaN(renewal.getTime())) {
    const yDiff = renewal.getUTCFullYear() - start.getUTCFullYear();
    const mDiff = renewal.getUTCMonth() - start.getUTCMonth();
    totalMonths = Math.max(1, yDiff * 12 + mDiff);
  }
  if (totalMonths === 0) {
    totalMonths = Math.max(elapsedMonths, 12);
  }

  const autoPaidInstallments = Math.min(elapsedMonths, totalMonths);
  const isEndedStatus =
    params.status === "EXPIRED" || params.status === "ARCHIVED";
  const autoRemainingInstallments = isEndedStatus
    ? 0
    : Math.max(0, totalMonths - autoPaidInstallments);

  const effectivePaidInstallments =
    typeof params.paidInstallments === "number" && params.paidInstallments >= 0
      ? params.paidInstallments
      : autoPaidInstallments;

  const effectiveRemainingInstallments =
    typeof params.remainingInstallments === "number" &&
    params.remainingInstallments >= 0
      ? params.remainingInstallments
      : autoRemainingInstallments;

  const effectivePaidCents =
    typeof params.paidAmountCents === "number" && params.paidAmountCents >= 0
      ? params.paidAmountCents
      : params.billingFrequency === "ONE_TIME"
        ? params.amountCents
        : effectivePaidInstallments * monthlyCents;

  const effectiveRemainingCents =
    typeof params.remainingAmountCents === "number" &&
    params.remainingAmountCents >= 0
      ? params.remainingAmountCents
      : isEndedStatus || params.billingFrequency === "ONE_TIME"
        ? 0
        : effectiveRemainingInstallments * monthlyCents;

  const effectiveTotalCents = effectivePaidCents + effectiveRemainingCents;
  const paymentProgressPercent =
    effectiveTotalCents > 0
      ? Math.min(100, Math.round((effectivePaidCents * 100) / effectiveTotalCents))
      : isEndedStatus
        ? 100
        : 0;

  return {
    effectivePaidCents,
    paidFormattedDe: formatEurCents(effectivePaidCents, "de"),
    effectiveRemainingCents,
    remainingFormattedDe: formatEurCents(effectiveRemainingCents, "de"),
    effectiveTotalCents,
    totalFormattedDe: formatEurCents(effectiveTotalCents, "de"),
    effectivePaidInstallments,
    effectiveRemainingInstallments,
    paymentProgressPercent,
  };
}

