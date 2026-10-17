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

  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  const contracts = await prisma.contract.findMany({
    where: { userId: actor.userId },
    orderBy: [{ cancellationDeadline: "asc" }, { provider: "asc" }],
  });

  if (format === "json") {
    return NextResponse.json(
      { exportedAt: new Date().toISOString(), contracts },
      {
        status: 200,
        headers: {
          "Content-Disposition": 'attachment; filename="vertraege-export.json"',
        },
      }
    );
  }

  const header = [
    "Anbieter",
    "Titel",
    "Kategorie",
    "Vertragsnummer",
    "Betrag (EUR)",
    "Intervall",
    "Startdatum",
    "Kuendigungsfrist",
    "Verlaengerungsdatum",
    "Status",
  ].join(";");

  const rows = contracts.map((c) =>
    [
      escapeCsvCell(c.provider),
      escapeCsvCell(c.title),
      escapeCsvCell(c.category),
      escapeCsvCell(c.contractNumber),
      escapeCsvCell(formatEurCents(c.amountCents, "de")),
      escapeCsvCell(c.billingFrequency),
      escapeCsvCell(formatDateDe(c.startDate)),
      escapeCsvCell(formatDateDe(c.cancellationDeadline)),
      escapeCsvCell(formatDateDe(c.renewalDate)),
      escapeCsvCell(c.status),
    ].join(";")
  );

  const csvContent = "\uFEFF" + [header, ...rows].join("\r\n");
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vertraege-export.csv"',
    },
  });
}
