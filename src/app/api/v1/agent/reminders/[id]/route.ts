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
  const existing = await prisma.reminder.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const completedAt =
    body.completed === true
      ? new Date()
      : body.completed === false
        ? null
        : existing.completedAt;

  const updated = await prisma.reminder.update({
    where: { id: existing.id },
    data: {
      title: typeof body.title === "string" ? body.title : existing.title,
      priority:
        typeof body.priority === "string"
          ? (body.priority as never)
          : existing.priority,
      completedAt,
    },
  });

  await recordAuditEvent({
    actor,
    action: "REMINDER_UPDATED",
    entityType: "Reminder",
    entityId: updated.id,
    metadata: { completed: Boolean(updated.completedAt) },
  });

  return NextResponse.json({ reminder: updated });
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
  const existing = await prisma.reminder.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  await prisma.reminder.delete({ where: { id: existing.id } });

  await recordAuditEvent({
    actor,
    action: "REMINDER_DELETED",
    entityType: "Reminder",
    entityId: existing.id,
  });

  return NextResponse.json({ deleted: true, id: existing.id });
}
