import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { formatDateDe } from "@/lib/format/date";

const CreateReminderSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  dueAt: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  repeatInterval: z.string().max(40).optional().nullable(),
  dedupeKey: z.string().max(180).optional().nullable(),
  contractId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminders = await prisma.reminder.findMany({
    where: { userId: actor.userId },
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
  });

  return NextResponse.json({
    reminders: reminders.map((r) => ({
      ...r,
      dueAtFormattedDe: formatDateDe(r.dueAt),
    })),
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const dueAt = new Date(data.dueAt);

  const reminder = data.dedupeKey
    ? await prisma.reminder.upsert({
        where: { dedupeKey: data.dedupeKey },
        update: {
          title: data.title,
          description: data.description ?? null,
          dueAt,
          priority: data.priority,
        },
        create: {
          title: data.title,
          description: data.description ?? null,
          dueAt,
          priority: data.priority,
          repeatInterval: data.repeatInterval ?? null,
          dedupeKey: data.dedupeKey,
          contractId: data.contractId ?? null,
          invoiceId: data.invoiceId ?? null,
          documentId: data.documentId ?? null,
          assetId: data.assetId ?? null,
          userId: actor.userId,
        },
      })
    : await prisma.reminder.create({
        data: {
          title: data.title,
          description: data.description ?? null,
          dueAt,
          priority: data.priority,
          repeatInterval: data.repeatInterval ?? null,
          contractId: data.contractId ?? null,
          invoiceId: data.invoiceId ?? null,
          documentId: data.documentId ?? null,
          assetId: data.assetId ?? null,
          userId: actor.userId,
        },
      });

  await recordAuditEvent({
    actor,
    action: "REMINDER_CREATED",
    entityType: "Reminder",
    entityId: reminder.id,
    metadata: { title: reminder.title, priority: reminder.priority },
  });

  return NextResponse.json({ reminder }, { status: 201 });
}
