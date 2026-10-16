import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  calculateBudgetSummary,
  calculateMonthlyEquivalentCents,
  formatEurCents,
  sumCents,
} from "@/lib/finance/money";
import { formatDateDe, resolveInvoiceStatus } from "@/lib/format/date";

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message:
          "Provide a valid Authorization: Bearer <HERMES_AGENT_API_KEY> header or active owner session.",
      },
      { status: 401 }
    );
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  const [
    transactions,
    budgets,
    activeContracts,
    invoices,
    recentDocuments,
    upcomingReminders,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: actor.userId,
        transactionDate: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.budget.findMany({
      where: { userId: actor.userId, year, month: month + 1 },
    }),
    prisma.contract.findMany({
      where: { userId: actor.userId, status: "ACTIVE", archivedAt: null },
      orderBy: { cancellationDeadline: "asc" },
    }),
    prisma.invoice.findMany({
      where: {
        userId: actor.userId,
        status: { in: ["PLANNED", "UNPAID", "OVERDUE"] },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.document.findMany({
      where: { userId: actor.userId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.reminder.findMany({
      where: { userId: actor.userId, completedAt: null },
      orderBy: { dueAt: "asc" },
      take: 10,
    }),
  ]);

  const incomeCents = sumCents(
    transactions
      .filter((t) => t.type === "INCOME" && t.status !== "PLANNED")
      .map((t) => t.amountCents)
  );
  const recordedExpenseCents = sumCents(
    transactions
      .filter((t) => t.type === "EXPENSE" && t.status === "RECORDED")
      .map((t) => t.amountCents)
  );
  const confirmedExpenseCents = sumCents(
    transactions
      .filter((t) => t.type === "EXPENSE" && t.status === "CONFIRMED")
      .map((t) => t.amountCents)
  );
  const plannedExpenseCents = sumCents(
    transactions
      .filter((t) => t.type === "EXPENSE" && t.status === "PLANNED")
      .map((t) => t.amountCents)
  );

  const totalBudgetLimitCents = sumCents(budgets.map((b) => b.amountCents));
  const budgetSummary = calculateBudgetSummary({
    budgetLimitCents: totalBudgetLimitCents || incomeCents,
    recordedExpenseCents,
    confirmedExpenseCents,
    plannedExpenseCents,
  });

  const recurringMonthlyCommitmentsCents = sumCents(
    activeContracts.map((c) =>
      calculateMonthlyEquivalentCents(c.amountCents, c.billingFrequency)
    )
  );

  return NextResponse.json({
    actor: {
      type: actor.actorType,
      label: actor.actorLabel,
    },
    period: {
      year,
      month: month + 1,
      timezone: "Europe/Berlin",
    },
    finances: {
      incomeCents,
      incomeFormattedDe: formatEurCents(incomeCents, "de"),
      actualExpenseCents: budgetSummary.actualSpentCents,
      actualExpenseFormattedDe: formatEurCents(
        budgetSummary.actualSpentCents,
        "de"
      ),
      plannedExpenseCents,
      remainingBudgetCents: budgetSummary.remainingCents,
      remainingBudgetFormattedDe: formatEurCents(
        budgetSummary.remainingCents,
        "de"
      ),
      recurringMonthlyCommitmentsCents,
      recurringMonthlyCommitmentsFormattedDe: formatEurCents(
        recurringMonthlyCommitmentsCents,
        "de"
      ),
    },
    expiringContracts: activeContracts.slice(0, 5).map((c) => ({
      id: c.id,
      provider: c.provider,
      title: c.title,
      category: c.category,
      amountCents: c.amountCents,
      amountFormattedDe: formatEurCents(c.amountCents, "de"),
      cancellationDeadline: c.cancellationDeadline,
      cancellationDeadlineFormattedDe: formatDateDe(c.cancellationDeadline),
    })),
    upcomingBills: invoices.map((inv) => ({
      id: inv.id,
      provider: inv.provider,
      description: inv.description,
      amountCents: inv.amountCents,
      amountFormattedDe: formatEurCents(inv.amountCents, "de"),
      dueDate: inv.dueDate,
      dueDateFormattedDe: formatDateDe(inv.dueDate),
      effectiveStatus: resolveInvoiceStatus({
        status: inv.status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        referenceNow: now,
      }),
    })),
    recentDocuments: recentDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      mimeType: doc.mimeType,
      uploadedAtFormattedDe: formatDateDe(doc.createdAt),
    })),
    upcomingReminders: upcomingReminders.map((rem) => ({
      id: rem.id,
      title: rem.title,
      priority: rem.priority,
      dueAt: rem.dueAt,
      dueAtFormattedDe: formatDateDe(rem.dueAt),
    })),
  });
}
