import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatEurCents } from "@/lib/finance/money";
import { formatDateDe } from "@/lib/format/date";

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.includes(";") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: actor.userId },
    include: { category: true },
    orderBy: { transactionDate: "desc" },
  });

  const header = [
    "Datum",
    "Beschreibung",
    "Typ",
    "Kategorie (DE)",
    "Kategorie (TR)",
    "Status",
    "Betrag (EUR)",
    "Betrag (Cent)",
  ].join(";");

  const rows = transactions.map((t) =>
    [
      escapeCsvCell(formatDateDe(t.transactionDate)),
      escapeCsvCell(t.description),
      escapeCsvCell(t.type),
      escapeCsvCell(t.category.nameDe),
      escapeCsvCell(t.category.nameTr),
      escapeCsvCell(t.status),
      escapeCsvCell(formatEurCents(t.amountCents, "de")),
      escapeCsvCell(t.amountCents),
    ].join(";")
  );

  const csvContent = "\uFEFF" + [header, ...rows].join("\r\n");
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="finanzen-export.csv"',
    },
  });
}
