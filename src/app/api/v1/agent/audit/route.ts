import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDateTimeDe } from "@/lib/format/date";

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.auditEvent.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    events: events.map((ev) => ({
      ...ev,
      createdAtFormattedDe: formatDateTimeDe(ev.createdAt),
    })),
  });
}
