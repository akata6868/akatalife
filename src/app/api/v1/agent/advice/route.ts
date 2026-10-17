import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import {
  calculateMonthlyEquivalentCents,
  formatEurCents,
  parseEurToCents,
  sumCents,
} from "@/lib/finance/money";
import { formatDateDe } from "@/lib/format/date";

const CreateAdviceSchema = z.object({
  title: z.string().min(1).max(220),
  category: z
    .enum([
      "SAVINGS",
      "WEALTH",
      "CONTRACT_OPTIMIZATION",
      "BUDGET",
      "DEBT_PAYOFF",
      "GENERAL",
    ])
    .default("SAVINGS"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "APPLIED", "DISMISSED"])
    .default("OPEN"),
  summary: z.string().min(1).max(8000),
  actionSteps: z.array(z.string().min(1).max(500)).default([]),
  monthlySavingsCents: z.number().int().min(0).optional(),
  monthlySavingsEur: z.union([z.string(), z.number()]).optional(),
  yearlySavingsCents: z.number().int().min(0).optional(),
  yearlySavingsEur: z.union([z.string(), z.number()]).optional(),
  targetAmountCents: z.number().int().min(0).optional().nullable(),
  targetAmountEur: z.union([z.string(), z.number()]).optional().nullable(),
  currentAmountCents: z.number().int().min(0).optional(),
  currentAmountEur: z.union([z.string(), z.number()]).optional(),
  contractId: z.string().optional().nullable(),
});

function resolveCents(
  centsVal?: number | null,
  eurVal?: string | number | null,
  fallback = 0
): number {
  if (typeof centsVal === "number" && Number.isFinite(centsVal)) {
    return Math.max(0, Math.round(centsVal));
  }
  if (eurVal !== undefined && eurVal !== null && String(eurVal).trim() !== "") {
    return Math.max(0, parseEurToCents(eurVal));
  }
  return fallback;
}

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const [adviceList, activeContracts, transactions] = await Promise.all([
    prisma.agentAdvice.findMany({
      where: {
        userId: actor.userId,
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.contract.findMany({
      where: { userId: actor.userId, status: "ACTIVE", archivedAt: null },
      orderBy: [{ cancellationDeadline: "asc" }],
    }),
    prisma.transaction.findMany({
      where: { userId: actor.userId },
      orderBy: [{ transactionDate: "desc" }],
      take: 100,
    }),
  ]);

  const enrichedAdvice = adviceList.map((item: any) => {
    const monthlyCents = Number(item.monthlySavingsCents ?? 0);
    const yearlyCents =
      Number(item.yearlySavingsCents ?? 0) || monthlyCents * 12;
    const targetCents =
      item.targetAmountCents !== null && item.targetAmountCents !== undefined
        ? Number(item.targetAmountCents)
        : null;
    const currentCents = Number(item.currentAmountCents ?? 0);
    const goalProgressPercent =
      targetCents && targetCents > 0
        ? Math.min(100, Math.round((currentCents * 100) / targetCents))
        : 0;

    return {
      ...item,
      monthlySavingsCents: monthlyCents,
      monthlySavingsFormattedDe: formatEurCents(monthlyCents, "de"),
      yearlySavingsCents: yearlyCents,
      yearlySavingsFormattedDe: formatEurCents(yearlyCents, "de"),
      targetAmountCents: targetCents,
      targetAmountFormattedDe:
        targetCents !== null ? formatEurCents(targetCents, "de") : null,
      currentAmountCents: currentCents,
      currentAmountFormattedDe: formatEurCents(currentCents, "de"),
      goalProgressPercent,
      createdAtFormattedDe: formatDateDe(item.createdAt),
    };
  });

  const openAndProgress = enrichedAdvice.filter(
    (a) => a.status === "OPEN" || a.status === "IN_PROGRESS"
  );
  const appliedAdvice = enrichedAdvice.filter((a) => a.status === "APPLIED");

  const potentialMonthlySavingsCents = sumCents(
    openAndProgress.map((a) => a.monthlySavingsCents)
  );
  const potentialYearlySavingsCents = sumCents(
    openAndProgress.map((a) => a.yearlySavingsCents)
  );
  const realizedYearlySavingsCents = sumCents(
    appliedAdvice.map((a) => a.yearlySavingsCents)
  );

  const wealthGoals = enrichedAdvice.filter(
    (a) => a.targetAmountCents !== null && a.targetAmountCents > 0
  );
  const totalTargetCents = sumCents(
    wealthGoals.map((a) => a.targetAmountCents ?? 0)
  );
  const totalCurrentSavedCents = sumCents(
    wealthGoals.map((a) => a.currentAmountCents)
  );
  const overallGoalProgressPercent =
    totalTargetCents > 0
      ? Math.min(100, Math.round((totalCurrentSavedCents * 100) / totalTargetCents))
      : 0;

  // Live automatic financial & contract insights
  const monthlyContractCommitmentsCents = sumCents(
    activeContracts.map((c: any) =>
      calculateMonthlyEquivalentCents(c.amountCents, c.billingFrequency)
    )
  );
  const totalIncomeCents = sumCents(
    transactions
      .filter((t: any) => t.type === "INCOME" && t.status !== "PLANNED")
      .map((t: any) => t.amountCents)
  );
  const totalExpenseCents = sumCents(
    transactions
      .filter((t: any) => t.type === "EXPENSE" && t.status !== "PLANNED")
      .map((t: any) => t.amountCents)
  );
  const suggestedMonthlySavingsCents =
    totalIncomeCents > 0 ? Math.round(totalIncomeCents * 0.2) : 0;

  return NextResponse.json({
    savingsSummary: {
      potentialMonthlySavingsCents,
      potentialMonthlySavingsFormattedDe: formatEurCents(
        potentialMonthlySavingsCents,
        "de"
      ),
      potentialYearlySavingsCents,
      potentialYearlySavingsFormattedDe: formatEurCents(
        potentialYearlySavingsCents,
        "de"
      ),
      realizedYearlySavingsCents,
      realizedYearlySavingsFormattedDe: formatEurCents(
        realizedYearlySavingsCents,
        "de"
      ),
      totalTargetCents,
      totalTargetFormattedDe: formatEurCents(totalTargetCents, "de"),
      totalCurrentSavedCents,
      totalCurrentSavedFormattedDe: formatEurCents(totalCurrentSavedCents, "de"),
      overallGoalProgressPercent,
      monthlyContractCommitmentsFormattedDe: formatEurCents(
        monthlyContractCommitmentsCents,
        "de"
      ),
      suggestedMonthlySavingsFormattedDe: formatEurCents(
        suggestedMonthlySavingsCents,
        "de"
      ),
      netBalanceFormattedDe: formatEurCents(
        totalIncomeCents - totalExpenseCents,
        "de"
      ),
    },
    advice: enrichedAdvice,
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateAdviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const monthlySavingsCents = resolveCents(
    data.monthlySavingsCents,
    data.monthlySavingsEur,
    0
  );
  const yearlySavingsCents = resolveCents(
    data.yearlySavingsCents,
    data.yearlySavingsEur,
    monthlySavingsCents * 12
  );
  const hasTarget =
    (typeof data.targetAmountCents === "number" && data.targetAmountCents > 0) ||
    (data.targetAmountEur !== undefined &&
      data.targetAmountEur !== null &&
      String(data.targetAmountEur).trim() !== "");
  const targetAmountCents = hasTarget
    ? resolveCents(data.targetAmountCents, data.targetAmountEur, 0)
    : null;
  const currentAmountCents = resolveCents(
    data.currentAmountCents,
    data.currentAmountEur,
    0
  );

  const created = await prisma.agentAdvice.create({
    data: {
      title: data.title,
      category: data.category,
      priority: data.priority,
      status: data.status,
      summary: data.summary,
      actionSteps: data.actionSteps,
      monthlySavingsCents,
      yearlySavingsCents,
      targetAmountCents,
      currentAmountCents,
      contractId: data.contractId ?? null,
      createdBy: actor.actorType,
      userId: actor.userId,
    },
  });

  await prisma.notification
    .create({
      data: {
        title: `Hermes Spartipp: ${created.title}`,
        message: created.summary,
        type: "SAVINGS",
        priority: created.priority || "HIGH",
        actionUrl: "/advisor",
        readAt: null,
        createdBy: actor.actorType,
        userId: actor.userId,
      },
    })
    .catch(() => {});

  await recordAuditEvent({
    actor,
    action: "ADVICE_CREATED",
    entityType: "AgentAdvice",
    entityId: created.id,
    metadata: {
      title: created.title,
      category: created.category,
      monthlySavingsCents,
      yearlySavingsCents,
      targetAmountCents,
    },
  });

  return NextResponse.json({ advice: created }, { status: 201 });
}
