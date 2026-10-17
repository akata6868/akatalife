import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { parseEurToCents } from "@/lib/finance/money";

const UpdateReportSchema = z.object({
  title: z.string().min(1).max(240).optional(),
  reportType: z.string().max(80).optional(),
  periodLabel: z.string().max(120).optional().nullable(),
  summary: z.string().max(16000).optional(),
  content: z.string().max(16000).optional(),
  highlights: z.array(z.string().max(1000)).optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  incomeCents: z.number().int().min(0).optional(),
  incomeEur: z.union([z.string(), z.number()]).optional(),
  expenseCents: z.number().int().min(0).optional(),
  expenseEur: z.union([z.string(), z.number()]).optional(),
  savingsCents: z.number().int().optional(),
  savingsEur: z.union([z.string(), z.number()]).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.agentReport.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const incomeCents =
    typeof data.incomeCents === "number"
      ? data.incomeCents
      : data.incomeEur !== undefined
        ? parseEurToCents(data.incomeEur)
        : existing.incomeCents;
  const expenseCents =
    typeof data.expenseCents === "number"
      ? data.expenseCents
      : data.expenseEur !== undefined
        ? parseEurToCents(data.expenseEur)
        : existing.expenseCents;
  const savingsCents =
    typeof data.savingsCents === "number"
      ? data.savingsCents
      : data.savingsEur !== undefined
        ? parseEurToCents(data.savingsEur)
        : existing.savingsCents;

  const updated = await prisma.agentReport.update({
    where: { id: existing.id },
    data: {
      title: data.title ?? existing.title,
      reportType: data.reportType
        ? data.reportType.toUpperCase()
        : existing.reportType,
      periodLabel:
        data.periodLabel !== undefined
          ? data.periodLabel
          : existing.periodLabel,
      summary: data.summary ?? data.content ?? existing.summary,
      highlights: data.highlights ?? existing.highlights,
      metrics: data.metrics ?? existing.metrics,
      incomeCents,
      expenseCents,
      savingsCents,
    },
  });

  await recordAuditEvent({
    actor,
    action: "REPORT_UPDATED",
    entityType: "AgentReport",
    entityId: updated.id,
    metadata: { title: updated.title, reportType: updated.reportType },
  });

  return NextResponse.json({ report: updated });
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
  const existing = await prisma.agentReport.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  await prisma.agentReport.delete({ where: { id: existing.id } });

  await recordAuditEvent({
    actor,
    action: "REPORT_DELETED",
    entityType: "AgentReport",
    entityId: existing.id,
    metadata: { title: existing.title },
  });

  return NextResponse.json({ deleted: true, id: existing.id });
}
