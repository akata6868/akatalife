import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { formatEurCents, parseEurToCents } from "@/lib/finance/money";
import { calculateContractDeadlines, formatDateDe } from "@/lib/format/date";

const CreateContractSchema = z.object({
  provider: z.string().min(1).max(160),
  title: z.string().min(1).max(200),
  category: z.enum([
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
  ]),
  contractNumber: z.string().max(120).optional().nullable(),
  startDate: z.string(),
  minimumTermMonths: z.number().int().min(0).max(600).optional().nullable(),
  noticePeriodDays: z.number().int().min(0).max(3650).optional().nullable(),
  explicitRenewalDate: z.string().optional().nullable(),
  amountCents: z.number().int().min(0).optional(),
  amountEur: z.union([z.string(), z.number()]).optional(),
  billingFrequency: z
    .enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "ONE_TIME"])
    .default("MONTHLY"),
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
});

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
      ...(category ? { category: category as never } : {}),
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

  return NextResponse.json({
    contracts: contracts.map((c) => ({
      ...c,
      amountFormattedDe: formatEurCents(c.amountCents, "de"),
      startDateFormattedDe: formatDateDe(c.startDate),
      cancellationDeadlineFormattedDe: formatDateDe(c.cancellationDeadline),
      renewalDateFormattedDe: formatDateDe(c.renewalDate),
    })),
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
  const amountCents =
    typeof data.amountCents === "number"
      ? data.amountCents
      : data.amountEur !== undefined
        ? parseEurToCents(data.amountEur)
        : 0;

  const startDate = new Date(data.startDate);
  const explicitRenewalDate = data.explicitRenewalDate
    ? new Date(data.explicitRenewalDate)
    : null;

  const { renewalDate, cancellationDeadline } = calculateContractDeadlines({
    startDate,
    minimumTermMonths: data.minimumTermMonths,
    noticePeriodDays: data.noticePeriodDays,
    explicitRenewalDate,
  });

  const contract = await prisma.contract.create({
    data: {
      provider: data.provider,
      title: data.title,
      category: data.category,
      contractNumber: data.contractNumber ?? null,
      startDate,
      minimumTermMonths: data.minimumTermMonths ?? null,
      noticePeriodDays: data.noticePeriodDays ?? null,
      cancellationDeadline,
      renewalDate,
      amountCents,
      billingFrequency: data.billingFrequency,
      paymentMethod: data.paymentMethod ?? null,
      status: data.status,
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      contactWebsite: data.contactWebsite ?? null,
      notes: data.notes ?? null,
      reminderDaysBefore: data.reminderDaysBefore,
      userId: actor.userId,
    },
  });

  // Automatically generate a deduplicated cancellation reminder if cancellationDeadline exists
  if (cancellationDeadline) {
    const reminderDate = new Date(
      cancellationDeadline.getTime() -
        data.reminderDaysBefore * 24 * 60 * 60 * 1000
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
    metadata: { provider: contract.provider, title: contract.title, amountCents },
  });

  return NextResponse.json({ contract }, { status: 201 });
}
