import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.invoice.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const nextStatus = body.status ?? existing.status;
  const paidAt =
    nextStatus === "PAID"
      ? body.paidAt
        ? new Date(String(body.paidAt))
        : new Date()
      : null;

  const updated = await prisma.invoice.update({
    where: { id: existing.id },
    data: {
      status: nextStatus as never,
      paidAt,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    },
  });

  if (nextStatus === "PAID") {
    // Complete linked due-date reminders when explicitly marked as PAID
    await prisma.reminder.updateMany({
      where: { invoiceId: existing.id, completedAt: null },
      data: { completedAt: new Date() },
    });
  }

  await recordAuditEvent({
    actor,
    action: "INVOICE_STATUS_UPDATED",
    entityType: "Invoice",
    entityId: updated.id,
    metadata: { status: updated.status, paidAt: updated.paidAt },
  });

  return NextResponse.json({ invoice: updated });
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
  const existing = await prisma.invoice.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  await prisma.invoice.delete({ where: { id: existing.id } });

  await recordAuditEvent({
    actor,
    action: "INVOICE_DELETED",
    entityType: "Invoice",
    entityId: existing.id,
  });

  return NextResponse.json({ deleted: true, id: existing.id });
}
