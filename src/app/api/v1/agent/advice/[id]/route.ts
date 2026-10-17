import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { parseEurToCents } from "@/lib/finance/money";

const UpdateAdviceSchema = z.object({
  title: z.string().min(1).max(220).optional(),
  category: z
    .enum([
      "SAVINGS",
      "WEALTH",
      "CONTRACT_OPTIMIZATION",
      "BUDGET",
      "DEBT_PAYOFF",
      "GENERAL",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "APPLIED", "DISMISSED"])
    .optional(),
  summary: z.string().min(1).max(8000).optional(),
  actionSteps: z.array(z.string().min(1).max(500)).optional(),
  monthlySavingsCents: z.number().int().min(0).optional(),
  monthlySavingsEur: z.union([z.string(), z.number()]).optional(),
  yearlySavingsCents: z.number().int().min(0).optional(),
  yearlySavingsEur: z.union([z.string(), z.number()]).optional(),
  targetAmountCents: z.number().int().min(0).optional().nullable(),
  targetAmountEur: z.union([z.string(), z.number()]).optional().nullable(),
  currentAmountCents: z.number().int().min(0).optional(),
  currentAmountEur: z.union([z.string(), z.number()]).optional(),
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
  const existing = await prisma.agentAdvice.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateAdviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const monthlySavingsCents =
    typeof data.monthlySavingsCents === "number"
      ? data.monthlySavingsCents
      : data.monthlySavingsEur !== undefined
        ? parseEurToCents(data.monthlySavingsEur)
        : existing.monthlySavingsCents;

  const yearlySavingsCents =
    typeof data.yearlySavingsCents === "number"
      ? data.yearlySavingsCents
      : data.yearlySavingsEur !== undefined
        ? parseEurToCents(data.yearlySavingsEur)
        : data.monthlySavingsCents !== undefined ||
            data.monthlySavingsEur !== undefined
          ? monthlySavingsCents * 12
          : existing.yearlySavingsCents;

  const targetAmountCents =
    data.targetAmountCents !== undefined
      ? data.targetAmountCents
      : data.targetAmountEur !== undefined
        ? data.targetAmountEur !== null &&
          String(data.targetAmountEur).trim() !== ""
          ? parseEurToCents(data.targetAmountEur)
          : null
        : existing.targetAmountCents;

  const currentAmountCents =
    typeof data.currentAmountCents === "number"
      ? data.currentAmountCents
      : data.currentAmountEur !== undefined
        ? parseEurToCents(data.currentAmountEur)
        : existing.currentAmountCents;

  const updated = await prisma.agentAdvice.update({
    where: { id: existing.id },
    data: {
      title: data.title ?? existing.title,
      category: data.category ?? existing.category,
      priority: data.priority ?? existing.priority,
      status: data.status ?? existing.status,
      summary: data.summary ?? existing.summary,
      actionSteps: data.actionSteps ?? existing.actionSteps,
      monthlySavingsCents,
      yearlySavingsCents,
      targetAmountCents,
      currentAmountCents,
    },
  });

  await recordAuditEvent({
    actor,
    action: "ADVICE_UPDATED",
    entityType: "AgentAdvice",
    entityId: updated.id,
    metadata: {
      status: updated.status,
      category: updated.category,
      currentAmountCents: updated.currentAmountCents,
    },
  });

  return NextResponse.json({ advice: updated });
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
  const existing = await prisma.agentAdvice.findFirst({
    where: { id, userId: actor.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NotFound" }, { status: 404 });
  }

  await prisma.agentAdvice.delete({ where: { id: existing.id } });

  await recordAuditEvent({
    actor,
    action: "ADVICE_DELETED",
    entityType: "AgentAdvice",
    entityId: existing.id,
    metadata: { title: existing.title },
  });

  return NextResponse.json({ deleted: true, id: existing.id });
}
