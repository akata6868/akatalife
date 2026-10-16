import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { formatEurCents, parseEurToCents } from "@/lib/finance/money";
import { formatDateDe, resolveInvoiceStatus } from "@/lib/format/date";

const CreateInvoiceSchema = z.object({
  description: z.string().min(1).max(240),
  provider: z.string().min(1).max(160),
  invoiceNumber: z.string().max(120).optional().nullable(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  amountCents: z.number().int().min(0).optional(),
  amountEur: z.union([z.string(), z.number()]).optional(),
  status: z
    .enum(["PLANNED", "UNPAID", "PAID", "OVERDUE", "CANCELLED"])
    .default("UNPAID"),
  paidAt: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { userId: actor.userId },
    include: {
      contract: { select: { id: true, provider: true, title: true } },
      document: { select: { id: true, title: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({
    invoices: invoices.map((inv) => ({
      ...inv,
      effectiveStatus: resolveInvoiceStatus({
        status: inv.status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        referenceNow: now,
      }),
      amountFormattedDe: formatEurCents(inv.amountCents, "de"),
      invoiceDateFormattedDe: formatDateDe(inv.invoiceDate),
      dueDateFormattedDe: formatDateDe(inv.dueDate),
    })),
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateInvoiceSchema.safeParse(body);
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
        ? Math.abs(parseEurToCents(data.amountEur))
        : 0;

  const dueDate = new Date(data.dueDate);
  const invoice = await prisma.invoice.create({
    data: {
      description: data.description,
      provider: data.provider,
      invoiceNumber: data.invoiceNumber ?? null,
      invoiceDate: new Date(data.invoiceDate),
      dueDate,
      amountCents,
      status: data.status,
      paidAt: data.paidAt ? new Date(data.paidAt) : null,
      contractId: data.contractId ?? null,
      documentId: data.documentId ?? null,
      notes: data.notes ?? null,
      userId: actor.userId,
    },
  });

  // Automatically create a deduplicated due-date reminder for unpaid invoices
  if (invoice.status !== "PAID" && invoice.status !== "CANCELLED") {
    const dedupeKey = `invoice-due:${invoice.id}`;
    await prisma.reminder.upsert({
      where: { dedupeKey },
      update: { dueAt: dueDate },
      create: {
        title: `Rechnung fällig: ${invoice.provider} (${formatEurCents(invoice.amountCents, "de")})`,
        description: invoice.description,
        dueAt: dueDate,
        priority: "HIGH",
        dedupeKey,
        invoiceId: invoice.id,
        userId: actor.userId,
      },
    });
  }

  await recordAuditEvent({
    actor,
    action: "INVOICE_CREATED",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: {
      provider: invoice.provider,
      amountCents: invoice.amountCents,
      status: invoice.status,
    },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
