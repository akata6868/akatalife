import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { prisma } from "@/lib/db/prisma";
import { ensureDefaultCategoriesForUser } from "@/lib/finance/default-categories";
import { formatEurCents, parseEurToCents, sumCents } from "@/lib/finance/money";
import { formatDateDe } from "@/lib/format/date";

const CreateTransactionSchema = z.object({
  description: z.string().min(1).max(240),
  amountCents: z.number().int().positive().optional(),
  amountEur: z.union([z.string(), z.number()]).optional(),
  transactionDate: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  status: z.enum(["PLANNED", "RECORDED", "CONFIRMED"]).default("RECORDED"),
  categorySlug: z.string().optional(),
  categoryId: z.string().optional(),
  paymentSource: z.string().max(120).optional().nullable(),
  contractId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultCategoriesForUser(actor.userId);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: actor.userId,
        ...(type ? { type: type as never } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: {
        category: true,
        contract: { select: { id: true, provider: true, title: true } },
      },
      orderBy: { transactionDate: "desc" },
      take: 200,
    }),
    prisma.category.findMany({
      where: { userId: actor.userId },
      orderBy: [{ type: "asc" }, { nameDe: "asc" }],
    }),
  ]);

  const totalIncomeCents = sumCents(
    transactions
      .filter((t) => t.type === "INCOME" && t.status !== "PLANNED")
      .map((t) => t.amountCents)
  );
  const totalExpenseCents = sumCents(
    transactions
      .filter((t) => t.type === "EXPENSE" && t.status !== "PLANNED")
      .map((t) => t.amountCents)
  );

  return NextResponse.json({
    totals: {
      totalIncomeCents,
      totalIncomeFormattedDe: formatEurCents(totalIncomeCents, "de"),
      totalExpenseCents,
      totalExpenseFormattedDe: formatEurCents(totalExpenseCents, "de"),
      netBalanceCents: totalIncomeCents - totalExpenseCents,
      netBalanceFormattedDe: formatEurCents(
        totalIncomeCents - totalExpenseCents,
        "de"
      ),
    },
    categories,
    transactions: transactions.map((t) => ({
      ...t,
      amountFormattedDe: formatEurCents(t.amountCents, "de"),
      transactionDateFormattedDe: formatDateDe(t.transactionDate),
    })),
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultCategoriesForUser(actor.userId);

  const body = await req.json().catch(() => null);
  const parsed = CreateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const amountCents =
    typeof data.amountCents === "number"
      ? data.amountCents
      : data.amountEur !== undefined
        ? Math.abs(parseEurToCents(data.amountEur))
        : 0;

  if (amountCents <= 0) {
    return NextResponse.json(
      { error: "ValidationError", message: "Amount must be greater than 0." },
      { status: 400 }
    );
  }

  let categoryId = data.categoryId;
  if (!categoryId) {
    const fallbackSlug =
      data.categorySlug ??
      (data.type === "INCOME" ? "other-income" : "other-expenses");
    const cat = await prisma.category.findFirst({
      where: { userId: actor.userId, slug: fallbackSlug },
    });
    if (!cat) {
      return NextResponse.json(
        { error: "CategoryNotFound", message: `Unknown category: ${fallbackSlug}` },
        { status: 400 }
      );
    }
    categoryId = cat.id;
  }

  const transaction = await prisma.transaction.create({
    data: {
      description: data.description,
      amountCents,
      transactionDate: new Date(data.transactionDate),
      type: data.type,
      status: data.status,
      categoryId,
      paymentSource: data.paymentSource ?? null,
      contractId: data.contractId ?? null,
      invoiceId: data.invoiceId ?? null,
      documentId: data.documentId ?? null,
      notes: data.notes ?? null,
      userId: actor.userId,
    },
    include: { category: true },
  });

  await recordAuditEvent({
    actor,
    action: "TRANSACTION_CREATED",
    entityType: "Transaction",
    entityId: transaction.id,
    metadata: {
      type: transaction.type,
      amountCents: transaction.amountCents,
      status: transaction.status,
    },
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
