import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import {
  calculateContractPaymentBreakdown,
  calculateMonthlyEquivalentCents,
  formatEurCents,
  parseEurToCents,
  sumCents,
} from "@/lib/finance/money";
import { formatDateDe } from "@/lib/format/date";

const CreateReportSchema = z.object({
  title: z.string().min(1).max(240),
  reportType: z
    .enum([
      "MONTHLY",
      "ANNUAL",
      "YEARLY",
      "SAVINGS_ANALYSIS",
      "CONTRACT_REVIEW",
      "BUDGET",
      "CUSTOM",
    ])
    .optional(),
  type: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  periodLabel: z.string().max(120).optional().nullable(),
  period: z.string().max(120).optional().nullable(),
  month: z.string().max(120).optional().nullable(),
  summary: z.string().max(16000).optional(),
  content: z.string().max(16000).optional(),
  description: z.string().max(16000).optional(),
  body: z.string().max(16000).optional(),
  highlights: z.array(z.string().max(1000)).optional(),
  keyFindings: z.array(z.string().max(1000)).optional(),
  items: z.array(z.string().max(1000)).optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  incomeCents: z.number().int().min(0).optional(),
  incomeEur: z.union([z.string(), z.number()]).optional(),
  expenseCents: z.number().int().min(0).optional(),
  expenseEur: z.union([z.string(), z.number()]).optional(),
  savingsCents: z.number().int().optional(),
  savingsEur: z.union([z.string(), z.number()]).optional(),
});

function resolveCents(
  centsVal?: number | null,
  eurVal?: string | number | null,
  fallback = 0
): number {
  if (typeof centsVal === "number" && Number.isFinite(centsVal)) {
    return Math.round(centsVal);
  }
  if (eurVal !== undefined && eurVal !== null && String(eurVal).trim() !== "") {
    return parseEurToCents(eurVal);
  }
  return fallback;
}

function normalizeReportType(raw?: string): string {
  if (!raw) return "MONTHLY";
  const upper = raw.toUpperCase();
  if (upper === "YEARLY") return "ANNUAL";
  if (
    [
      "MONTHLY",
      "ANNUAL",
      "SAVINGS_ANALYSIS",
      "CONTRACT_REVIEW",
      "BUDGET",
      "CUSTOM",
    ].includes(upper)
  ) {
    return upper;
  }
  return "CUSTOM";
}

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reportType = searchParams.get("reportType") ?? undefined;

  const [reports, contracts, transactions, invoices] = await Promise.all([
    prisma.agentReport.findMany({
      where: {
        userId: actor.userId,
        ...(reportType ? { reportType: normalizeReportType(reportType) } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.contract.findMany({
      where: { userId: actor.userId, archivedAt: null },
    }),
    prisma.transaction.findMany({
      where: { userId: actor.userId },
      orderBy: [{ transactionDate: "desc" }],
    }),
    prisma.invoice.findMany({
      where: { userId: actor.userId },
    }),
  ]);

  const now = new Date();
  const activeContracts = contracts.filter((c: any) => c.status === "ACTIVE");
  const terminatedContracts = contracts.filter(
    (c: any) => c.status !== "ACTIVE"
  );

  const monthlyFixedCents = sumCents(
    activeContracts.map((c: any) =>
      calculateMonthlyEquivalentCents(c.amountCents, c.billingFrequency)
    )
  );
  const yearlyFixedCents = monthlyFixedCents * 12;

  const contractBreakdowns = contracts.map((c: any) =>
    calculateContractPaymentBreakdown({
      amountCents: c.amountCents,
      billingFrequency: c.billingFrequency,
      startDate: c.startDate,
      renewalDate: c.renewalDate,
      minimumTermMonths: c.minimumTermMonths,
      status: c.status,
      paidAmountCents: c.paidAmountCents,
      remainingAmountCents: c.remainingAmountCents,
      paidInstallments: c.paidInstallments,
      remainingInstallments: c.remainingInstallments,
      referenceNow: now,
    })
  );

  const totalContractsPaidCents = sumCents(
    contractBreakdowns.map((b) => b.effectivePaidCents)
  );
  const totalContractsRemainingCents = sumCents(
    contractBreakdowns.map((b) => b.effectiveRemainingCents)
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
  const netBalanceCents = totalIncomeCents - totalExpenseCents;

  // Group active contracts by category
  const categoryMap = new Map<string, { count: number; monthlyCents: number }>();
  for (const c of activeContracts) {
    const cat = String(c.category || "OTHER");
    const prev = categoryMap.get(cat) ?? { count: 0, monthlyCents: 0 };
    const eq = calculateMonthlyEquivalentCents(
      c.amountCents,
      c.billingFrequency
    );
    categoryMap.set(cat, {
      count: prev.count + 1,
      monthlyCents: prev.monthlyCents + eq,
    });
  }

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, info]) => ({
      category,
      count: info.count,
      monthlyCents: info.monthlyCents,
      monthlyFormattedDe: formatEurCents(info.monthlyCents, "de"),
      yearlyCents: info.monthlyCents * 12,
      yearlyFormattedDe: formatEurCents(info.monthlyCents * 12, "de"),
      sharePercent:
        monthlyFixedCents > 0
          ? Math.round((info.monthlyCents * 100) / monthlyFixedCents)
          : 0,
    }))
    .sort((a, b) => b.monthlyCents - a.monthlyCents);

  const unpaidInvoicesCents = sumCents(
    invoices
      .filter((inv: any) => inv.status === "UNPAID" || inv.status === "OVERDUE")
      .map((inv: any) => inv.amountCents)
  );

  const enrichedReports = reports.map((r: any) => ({
    ...r,
    incomeFormattedDe: formatEurCents(Number(r.incomeCents ?? 0), "de"),
    expenseFormattedDe: formatEurCents(Number(r.expenseCents ?? 0), "de"),
    savingsFormattedDe: formatEurCents(Number(r.savingsCents ?? 0), "de"),
    createdAtFormattedDe: formatDateDe(r.createdAt),
  }));

  return NextResponse.json({
    liveAnalytics: {
      activeContractsCount: activeContracts.length,
      terminatedContractsCount: terminatedContracts.length,
      monthlyFixedCents,
      monthlyFixedFormattedDe: formatEurCents(monthlyFixedCents, "de"),
      yearlyFixedCents,
      yearlyFixedFormattedDe: formatEurCents(yearlyFixedCents, "de"),
      totalContractsPaidCents,
      totalContractsPaidFormattedDe: formatEurCents(
        totalContractsPaidCents,
        "de"
      ),
      totalContractsRemainingCents,
      totalContractsRemainingFormattedDe: formatEurCents(
        totalContractsRemainingCents,
        "de"
      ),
      totalIncomeCents,
      totalIncomeFormattedDe: formatEurCents(totalIncomeCents, "de"),
      totalExpenseCents,
      totalExpenseFormattedDe: formatEurCents(totalExpenseCents, "de"),
      netBalanceCents,
      netBalanceFormattedDe: formatEurCents(netBalanceCents, "de"),
      unpaidInvoicesCents,
      unpaidInvoicesFormattedDe: formatEurCents(unpaidInvoicesCents, "de"),
      categoryBreakdown,
    },
    reports: enrichedReports,
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const summaryText = (
    data.summary ||
    data.content ||
    data.description ||
    data.body ||
    data.title
  ).trim();

  const reportType = normalizeReportType(
    data.reportType || data.type || data.category
  );
  const periodLabel = data.periodLabel || data.period || data.month || null;
  const highlights = data.highlights || data.keyFindings || data.items || [];
  const metrics = data.metrics || data.data || {};

  const incomeCents = resolveCents(data.incomeCents, data.incomeEur, 0);
  const expenseCents = resolveCents(data.expenseCents, data.expenseEur, 0);
  const savingsCents = resolveCents(
    data.savingsCents,
    data.savingsEur,
    incomeCents > 0 || expenseCents > 0 ? incomeCents - expenseCents : 0
  );

  const created = await prisma.agentReport.create({
    data: {
      title: data.title,
      reportType,
      periodLabel,
      summary: summaryText,
      highlights,
      metrics,
      incomeCents,
      expenseCents,
      savingsCents,
      createdBy: actor.actorType,
      userId: actor.userId,
    },
  });

  await prisma.notification
    .create({
      data: {
        title: `Neuer Bericht: ${created.title}`,
        message: summaryText.slice(0, 240),
        type: "INFO",
        priority: "HIGH",
        actionUrl: "/reports",
        readAt: null,
        createdBy: actor.actorType,
        userId: actor.userId,
      },
    })
    .catch(() => {});

  await recordAuditEvent({
    actor,
    action: "REPORT_CREATED",
    entityType: "AgentReport",
    entityId: created.id,
    metadata: {
      title: created.title,
      reportType: created.reportType,
      periodLabel: created.periodLabel,
    },
  });

  return NextResponse.json({ report: created }, { status: 201 });
}
