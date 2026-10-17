import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { formatEurCents, parseEurToCents } from "@/lib/finance/money";
import { formatDateDe } from "@/lib/format/date";

const UpdateTransactionSchema = z.object({
  description: z.string().min(1).max(240).optional(),
  amountCents: z.number().int().positive().optional(),
  amountEur: z.union([z.string(), z.number()]).optional(),
  transactionDate: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  status: z.enum(["PLANNED", "RECORDED", "CONFIRMED"]).optional(),
  categorySlug: z.string().optional(),
  categoryId: z.string().optional(),
  paymentSource: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

function serialize(t: any) {
  return {
    ...t,
    amountFormattedDe: formatEurCents(t.amountCents, "de"),
    transactionDateFormattedDe: formatDateDe(t.transactionDate),
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: actor.userId },
    include: { category: true },
  });
  if (!transaction) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }
  return NextResponse.json({ transaction: serialize(transaction) });
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

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const updates: Record<string, unknown> = {};
  if (data.description !== undefined) updates.description = data.description;
  if (data.type !== undefined) updates.type = data.type;
  if (data.status !== undefined) updates.status = data.status;
  if (data.paymentSource !== undefined)
    updates.paymentSource = data.paymentSource;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.transactionDate !== undefined)
    updates.transactionDate = new Date(data.transactionDate);

  if (typeof data.amountCents === "number") {
    updates.amountCents = data.amountCents;
  } else if (data.amountEur !== undefined) {
    const cents = Math.abs(parseEurToCents(data.amountEur));
    if (cents <= 0) {
      return NextResponse.json(
        { error: "ValidationError", message: "Amount must be greater than 0." },
        { status: 400 }
      );
    }
    updates.amountCents = cents;
  }

  if (data.categoryId) {
    updates.categoryId = data.categoryId;
  } else if (data.categorySlug) {
    const cat = await prisma.category.findFirst({
      where: { userId: actor.userId, slug: data.categorySlug },
    });
    if (!cat) {
      return NextResponse.json(
        {
          error: "CategoryNotFound",
          message: `Unknown category: ${data.categorySlug}`,
        },
        { status: 400 }
      );
    }
    updates.categoryId = cat.id;
  }

  const updated = await prisma.transaction.update({
    where: { id: existing.id },
    data: updates,
    include: { category: true },
  });

  await recordAuditEvent({
    actor,
    action: "TRANSACTION_UPDATED",
    entityType: "Transaction",
    entityId: updated.id,
    metadata: { fields: Object.keys(updates) },
  });

  return NextResponse.json({ transaction: serialize(updated) });
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

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id: existing.id } });

  await recordAuditEvent({
    actor,
    action: "TRANSACTION_DELETED",
    entityType: "Transaction",
    entityId: existing.id,
    metadata: {
      type: existing.type,
      amountCents: existing.amountCents,
      description: existing.description,
    },
  });

  return NextResponse.json({ deleted: true, id: existing.id });
}
