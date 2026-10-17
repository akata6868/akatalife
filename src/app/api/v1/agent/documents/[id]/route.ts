import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { resolveSafeStoragePath } from "@/lib/storage/documents";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.document.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updated = await prisma.document.update({
    where: { id: existing.id },
    data: {
      title: typeof body.title === "string" ? body.title : existing.title,
      category:
        typeof body.category === "string"
          ? (body.category as never)
          : existing.category,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      archivedAt:
        body.archived === true
          ? new Date()
          : body.archived === false
            ? null
            : existing.archivedAt,
    },
  });

  await recordAuditEvent({
    actor,
    action: "DOCUMENT_UPDATED",
    entityType: "Document",
    entityId: updated.id,
  });

  return NextResponse.json({ document: updated });
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
  const existing = await prisma.document.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  try {
    const filePath = resolveSafeStoragePath(existing.storageKey);
    await fs.unlink(filePath).catch(() => {});
  } catch {
    // Ignore missing file on disk during deletion
  }

  await prisma.document.delete({ where: { id: existing.id } });

  await recordAuditEvent({
    actor,
    action: "DOCUMENT_DELETED",
    entityType: "Document",
    entityId: existing.id,
    metadata: {
      title: existing.title,
      originalFilename: existing.originalFilename,
    },
  });

  return NextResponse.json({ deleted: true, id: existing.id });
}
