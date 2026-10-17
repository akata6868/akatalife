import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { formatEurCents, parseEurToCents } from "@/lib/finance/money";
import { calculateContractDeadlines, formatDateDe } from "@/lib/format/date";

const UpdateContractSchema = z.object({
  provider: z.string().min(1).max(160).optional(),
  title: z.string().min(1).max(200).optional(),
  category: z
    .enum([
      "ELECTRICITY",
      "GAS",
      "WATER",
      "INTERNET",
      "MOBILE",
      "INSURANCE",
      "RENT",
      "VEHICLE_INSURANCE",
      "VEHICLE_FINANCING",
      "SUBSCRIPTION",
      "OTHER",
    ])
    .optional(),
  contractNumber: z.string().max(120).optional().nullable(),
  startDate: z.string().optional(),
  minimumTermMonths: z.number().int().min(0).max(600).optional().nullable(),
  noticePeriodDays: z.number().int().min(0).max(3650).optional().nullable(),
  explicitRenewalDate: z.string().optional().nullable(),
  amountCents: z.number().int().min(0).optional(),
  amountEur: z.union([z.string(), z.number()]).optional(),
  billingFrequency: z
    .enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "ONE_TIME"])
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
    .optional(),
  notes: z.string().max(4000).optional().nullable(),
  archived: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const contract = await prisma.contract.findFirst({
    where: { id, userId: actor.userId },
    include: {
      documents: true,
      invoices: { orderBy: { dueDate: "desc" } },
      reminders: { orderBy: { dueAt: "asc" } },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  return NextResponse.json({
    contract: {
      ...contract,
      amountFormattedDe: formatEurCents(contract.amountCents, "de"),
      startDateFormattedDe: formatDateDe(contract.startDate),
      cancellationDeadlineFormattedDe: formatDateDe(
        contract.cancellationDeadline
      ),
      renewalDateFormattedDe: formatDateDe(contract.renewalDate),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.contract.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const amountCents =
    typeof data.amountCents === "number"
      ? data.amountCents
      : data.amountEur !== undefined
        ? parseEurToCents(data.amountEur)
        : existing.amountCents;

  const startDate = data.startDate
    ? new Date(data.startDate)
    : existing.startDate;
  const minimumTermMonths =
    data.minimumTermMonths !== undefined
      ? data.minimumTermMonths
      : existing.minimumTermMonths;
  const noticePeriodDays =
    data.noticePeriodDays !== undefined
      ? data.noticePeriodDays
      : existing.noticePeriodDays;
  const explicitRenewalDate =
    data.explicitRenewalDate !== undefined
      ? data.explicitRenewalDate
        ? new Date(data.explicitRenewalDate)
        : null
      : existing.renewalDate;

  const { renewalDate, cancellationDeadline } = calculateContractDeadlines({
    startDate,
    minimumTermMonths,
    noticePeriodDays,
    explicitRenewalDate,
  });

  const updated = await prisma.contract.update({
    where: { id: existing.id },
    data: {
      provider: data.provider ?? existing.provider,
      title: data.title ?? existing.title,
      category: data.category ?? existing.category,
      contractNumber:
        data.contractNumber !== undefined
          ? data.contractNumber
          : existing.contractNumber,
      startDate,
      minimumTermMonths,
      noticePeriodDays,
      renewalDate,
      cancellationDeadline,
      amountCents,
      billingFrequency: data.billingFrequency ?? existing.billingFrequency,
      paymentMethod:
        data.paymentMethod !== undefined
          ? data.paymentMethod
          : existing.paymentMethod,
      status:
        data.archived === true
          ? "ARCHIVED"
          : (data.status ?? existing.status),
      archivedAt:
        data.archived === true
          ? new Date()
          : data.archived === false
            ? null
            : existing.archivedAt,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    },
  });

  await recordAuditEvent({
    actor,
    action: "CONTRACT_UPDATED",
    entityType: "Contract",
    entityId: updated.id,
    metadata: { status: updated.status, amountCents: updated.amountCents },
  });

  return NextResponse.json({ contract: updated });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.contract.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  await prisma.contract.delete({ where: { id: existing.id } });

  await recordAuditEvent({
    actor,
    action: "CONTRACT_DELETED",
    entityType: "Contract",
    entityId: existing.id,
    metadata: { provider: existing.provider, title: existing.title },
  });

  return NextResponse.json({ deleted: true, id: existing.id });
}
