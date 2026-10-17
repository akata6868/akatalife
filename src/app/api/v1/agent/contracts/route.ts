import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import {
  calculateContractPaymentBreakdown,
  formatEurCents,
  parseEurToCents,
  sumCents,
} from "@/lib/finance/money";
import { calculateContractDeadlines, formatDateDe } from "@/lib/format/date";

const CreateContractSchema = z.object({
  provider: z.string().min(1).max(160).optional(),
  providerName: z.string().min(1).max(160).optional(),
  title: z.string().min(1).max(200),
  category: z
    .enum([
      "ELECTRICITY",
      "GAS",
      "WATER",
      "INTERNET",
      "MOBILE",
      "INSURANCE",
      "RENT",
      "HOUSING",
      "ENERGY",
      "STREAMING",
      "FITNESS",
      "BANKING",
      "MOBILITY",
      "VEHICLE_INSURANCE",
      "VEHICLE_FINANCING",
      "SUBSCRIPTION",
      "OTHER",
    ])
    .default("OTHER"),
  contractNumber: z.string().max(120).optional().nullable(),
  startDate: z.string(),
  minimumTermMonths: z.number().int().min(0).max(600).optional().nullable(),
  noticePeriodDays: z.number().int().min(0).max(3650).optional().nullable(),
  explicitRenewalDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  amountCents: z.number().int().min(0).optional(),
  amountEur: z.union([z.string(), z.number()]).optional(),
  paidAmountCents: z.number().int().min(0).optional().nullable(),
  paidAmountEur: z.union([z.string(), z.number()]).optional().nullable(),
  remainingAmountCents: z.number().int().min(0).optional().nullable(),
  remainingAmountEur: z.union([z.string(), z.number()]).optional().nullable(),
  paidInstallments: z.number().int().min(0).optional().nullable(),
  remainingInstallments: z.number().int().min(0).optional().nullable(),
  billingFrequency: z
    .enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "YEARLY", "ONE_TIME"])
    .optional(),
  billingCycle: z
    .enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "YEARLY", "ONE_TIME"])
    .optional(),
  paymentMethod: z.string().max(120).optional().nullable(),
  status: z
    .enum([
      "ACTIVE",
      "CANCELLATION_PLANNED",
      "CANCELLED",
      "EXPIRED",
      "ARCHIVED",
    ])
    .default("ACTIVE"),
  contactName: z.string().max(160).optional().nullable(),
  contactEmail: z.string().max(160).optional().nullable(),
  contactPhone: z.string().max(80).optional().nullable(),
  contactWebsite: z.string().max(250).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  reminderDaysBefore: z.number().int().min(1).max(365).default(30),
  reminderLeadDays: z.number().int().min(1).max(365).optional(),
});

function normalizeCategory(raw: string): string {
  const map: Record<string, string> = {
    HOUSING: "RENT",
    ENERGY: "ELECTRICITY",
    STREAMING: "SUBSCRIPTION",
    FITNESS: "SUBSCRIPTION",
    BANKING: "OTHER",
    MOBILITY: "OTHER",
  };
  return map[raw] ?? raw;
}

function normalizeBillingFrequency(
  raw?: string
): "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | "ONE_TIME" {
  if (!raw) return "MONTHLY";
  if (raw === "YEARLY") return "ANNUAL";
  return raw as "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | "ONE_TIME";
}

function resolveOptionalCents(
  centsVal?: number | null,
  eurVal?: string | number | null
): number | null {
  if (typeof centsVal === "number") return centsVal;
  if (eurVal !== undefined && eurVal !== null && String(eurVal).trim() !== "") {
    return parseEurToCents(eurVal);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q")?.trim();

  const contracts = await prisma.contract.findMany({
    where: {
      userId: actor.userId,
      ...(status ? { status: status as never } : { archivedAt: null }),
      ...(category ? { category: normalizeCategory(category) as never } : {}),
      ...(q
        ? {
            OR: [
              { provider: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { contractNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      documents: {
        select: { id: true, title: true, originalFilename: true, category: true },
      },
    },
    orderBy: [{ cancellationDeadline: "asc" }, { createdAt: "desc" }],
  });

  const now = new Date();

  const enrichedContracts = contracts.map((c: any) => {
    const isEndedByDate =
      c.renewalDate !== null &&
      new Date(c.renewalDate).getTime() < now.getTime() &&
      c.status !== "ACTIVE";
    const isTerminatedOrEnded =
      c.status === "CANCELLED" ||
      c.status === "CANCELLATION_PLANNED" ||
      c.status === "EXPIRED" ||
      c.status === "ARCHIVED" ||
      isEndedByDate;

    const paymentBreakdown = calculateContractPaymentBreakdown({
      amountCents: c.amountCents,
      billingFrequency: c.billingFrequency,
      startDate: c.startDate,
      renewalDate: c.renewalDate,
      minimumTermMonths: c.minimumTermMonths,
      status: c.status,
      paidAmountCents: c.paidAmountCents,
      remainingAmountCents: c.remainingAmountCents,
      paidInstallments: c.paidInstallments,
      remainingInstallments: c.remainingInstallments,
      referenceNow: now,
    });

    return {
      ...c,
      isTerminatedOrEnded,
      amountFormattedDe: formatEurCents(c.amountCents, "de"),
      startDateFormattedDe: formatDateDe(c.startDate),
      cancellationDeadlineFormattedDe: formatDateDe(c.cancellationDeadline),
      renewalDateFormattedDe: formatDateDe(c.renewalDate),
      ...paymentBreakdown,
    };
  });

  const totalPaidCents = sumCents(
    enrichedContracts.map((c) => c.effectivePaidCents)
  );
  const totalRemainingCents = sumCents(
    enrichedContracts.map((c) => c.effectiveRemainingCents)
  );

  return NextResponse.json({
    paymentSummary: {
      totalPaidCents,
      totalPaidFormattedDe: formatEurCents(totalPaidCents, "de"),
      totalRemainingCents,
      totalRemainingFormattedDe: formatEurCents(totalRemainingCents, "de"),
    },
    contracts: enrichedContracts,
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const providerName = (data.provider || data.providerName || "").trim();
  if (!providerName) {
    return NextResponse.json(
      { error: "ValidationError", message: "provider or providerName is required" },
      { status: 400 }
    );
  }

  const amountCents =
    typeof data.amountCents === "number"
      ? data.amountCents
      : data.amountEur !== undefined
        ? parseEurToCents(data.amountEur)
        : 0;

  const paidAmountCents = resolveOptionalCents(
    data.paidAmountCents,
    data.paidAmountEur
  );
  const remainingAmountCents = resolveOptionalCents(
    data.remainingAmountCents,
    data.remainingAmountEur
  );

  const startDate = new Date(data.startDate);
  const explicitRenewalStr = data.explicitRenewalDate || data.endDate;
  const explicitRenewalDate = explicitRenewalStr
    ? new Date(explicitRenewalStr)
    : null;

  const { renewalDate, cancellationDeadline } = calculateContractDeadlines({
    startDate,
    minimumTermMonths: data.minimumTermMonths,
    noticePeriodDays: data.noticePeriodDays,
    explicitRenewalDate,
  });

  const reminderDays = data.reminderLeadDays ?? data.reminderDaysBefore ?? 30;

  const contract = await prisma.contract.create({
    data: {
      provider: providerName,
      title: data.title,
      category: normalizeCategory(data.category) as never,
      contractNumber: data.contractNumber ?? null,
      startDate,
      minimumTermMonths: data.minimumTermMonths ?? null,
      noticePeriodDays: data.noticePeriodDays ?? null,
      cancellationDeadline,
      renewalDate,
      amountCents,
      paidAmountCents,
      remainingAmountCents,
      paidInstallments: data.paidInstallments ?? null,
      remainingInstallments: data.remainingInstallments ?? null,
      billingFrequency: normalizeBillingFrequency(
        data.billingFrequency || data.billingCycle
      ),
      paymentMethod: data.paymentMethod ?? null,
      status: data.status,
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      contactWebsite: data.contactWebsite ?? null,
      notes: data.notes ?? null,
      reminderDaysBefore: reminderDays,
      userId: actor.userId,
    },
  });

  // Automatically generate a deduplicated cancellation reminder if cancellationDeadline exists and contract is ACTIVE
  if (cancellationDeadline && data.status === "ACTIVE") {
    const reminderDate = new Date(
      cancellationDeadline.getTime() - reminderDays * 24 * 60 * 60 * 1000
    );
    const dedupeKey = `contract-cancel:${contract.id}:${cancellationDeadline.toISOString().slice(0, 10)}`;
    await prisma.reminder.upsert({
      where: { dedupeKey },
      update: {
        dueAt: reminderDate,
        title: `Kündigungsfrist: ${contract.provider} (${contract.title})`,
      },
      create: {
        title: `Kündigungsfrist: ${contract.provider} (${contract.title})`,
        description: `Letzter Kündigungstermin am ${formatDateDe(cancellationDeadline)}`,
        dueAt: reminderDate,
        priority: "HIGH",
        dedupeKey,
        contractId: contract.id,
        userId: actor.userId,
      },
    });
  }

  await recordAuditEvent({
    actor,
    action: "CONTRACT_CREATED",
    entityType: "Contract",
    entityId: contract.id,
    metadata: {
      provider: contract.provider,
      title: contract.title,
      amountCents,
      paidAmountCents,
      remainingAmountCents,
    },
  });

  return NextResponse.json({ contract }, { status: 201 });
}
