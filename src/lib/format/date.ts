/**
 * Date formatting (DD.MM.YYYY in Europe/Berlin), Contract Cancellation Deadline,
 * and Invoice Overdue Status Calculators.
 */

export const BERLIN_TIMEZONE = "Europe/Berlin";

/**
 * Formats a Date or ISO string as DD.MM.YYYY in the Europe/Berlin time zone.
 */
export function formatDateDe(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "—";

  const formatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return formatter.format(date);
}

/**
 * Formats a Date or ISO string as DD.MM.YYYY HH:mm in the Europe/Berlin time zone.
 */
export function formatDateTimeDe(
  dateInput: Date | string | null | undefined
): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "—";

  const formatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Calculates the contract end/renewal date and latest cancellation deadline
 * given startDate, minimumTermMonths, and noticePeriodDays.
 */
export function calculateContractDeadlines(params: {
  startDate: Date;
  minimumTermMonths?: number | null;
  noticePeriodDays?: number | null;
  explicitRenewalDate?: Date | null;
}): {
  renewalDate: Date | null;
  cancellationDeadline: Date | null;
} {
  let renewalDate: Date | null = params.explicitRenewalDate
    ? new Date(params.explicitRenewalDate.getTime())
    : null;

  if (!renewalDate && params.minimumTermMonths && params.minimumTermMonths > 0) {
    renewalDate = new Date(Date.UTC(
      params.startDate.getUTCFullYear(),
      params.startDate.getUTCMonth() + params.minimumTermMonths,
      params.startDate.getUTCDate()
    ));
  }

  if (!renewalDate) {
    return { renewalDate: null, cancellationDeadline: null };
  }

  const noticeDays = params.noticePeriodDays ?? 0;
  const cancellationDeadline = new Date(
    renewalDate.getTime() - noticeDays * 24 * 60 * 60 * 1000
  );

  return {
    renewalDate,
    cancellationDeadline,
  };
}

/**
 * Resolves effective invoice status based on stored status, paidAt, and dueDate.
 * Automatically marks UNPAID or PLANNED invoices past their dueDate as OVERDUE.
 * Never automatically marks an invoice as PAID without an explicit paid status/record.
 */
export function resolveInvoiceStatus(params: {
  status: "PLANNED" | "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDate: Date;
  paidAt?: Date | null;
  referenceNow?: Date;
}): "PLANNED" | "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED" {
  if (params.status === "CANCELLED") return "CANCELLED";
  if (params.status === "PAID" || params.paidAt) return "PAID";

  const now = params.referenceNow ?? new Date();
  if (params.dueDate.getTime() < now.getTime()) {
    return "OVERDUE";
  }

  return params.status;
}
