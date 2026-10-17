import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { formatDateDe } from "@/lib/format/date";

const CreateNotificationSchema = z.object({
  title: z.string().min(1).max(220),
  message: z.string().max(4000).optional(),
  body: z.string().max(4000).optional(),
  summary: z.string().max(4000).optional(),
  type: z
    .enum([
      "INFO",
      "WARNING",
      "CRITICAL",
      "SAVINGS",
      "CONTRACT",
      "INVOICE",
      "REMINDER",
    ])
    .default("INFO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("HIGH"),
  actionUrl: z.string().max(300).optional().nullable(),
  url: z.string().max(300).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const items = await prisma.notification.findMany({
    where: {
      userId: actor.userId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });

  const enriched = items.map((n: any) => ({
    ...n,
    isRead: Boolean(n.readAt),
    createdAtFormattedDe: formatDateDe(n.createdAt),
    createdAtIso:
      n.createdAt instanceof Date
        ? n.createdAt.toISOString()
        : String(n.createdAt),
  }));

  const unreadCount = enriched.filter((n) => !n.isRead).length;

  return NextResponse.json({
    unreadCount,
    notifications: enriched,
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = CreateNotificationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const messageText = (
    data.message ||
    data.body ||
    data.summary ||
    data.title
  ).trim();

  const created = await prisma.notification.create({
    data: {
      title: data.title,
      message: messageText,
      type: data.type,
      priority: data.priority,
      actionUrl: data.actionUrl || data.url || null,
      readAt: null,
      createdBy: actor.actorType,
      userId: actor.userId,
    },
  });

  await recordAuditEvent({
    actor,
    action: "NOTIFICATION_SENT",
    entityType: "Notification",
    entityId: created.id,
    metadata: {
      title: created.title,
      type: created.type,
      priority: created.priority,
    },
  });

  return NextResponse.json({ notification: created }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.markAllRead) {
    await prisma.notification.markAllRead(actor.userId);
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    const existing = await prisma.notification.findFirst({
      where: { id: String(body.id), userId: actor.userId },
    });
    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: { readAt: new Date() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
