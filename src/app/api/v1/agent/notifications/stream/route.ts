import { NextRequest } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatDateDe } from "@/lib/format/date";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  req.signal.addEventListener("abort", () => {
    closed = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
            )
          );
        } catch {
          closed = true;
        }
      };

      // Send initial snapshot immediately
      const pushSnapshot = async () => {
        if (closed) return;
        try {
          const items = await prisma.notification.findMany({
            where: { userId: actor.userId },
            orderBy: [{ createdAt: "desc" }],
            take: 30,
          });
          const enriched = items.map((n: any) => ({
            ...n,
            isRead: Boolean(n.readAt),
            createdAtFormattedDe: formatDateDe(n.createdAt),
          }));
          const unreadCount = enriched.filter((n) => !n.isRead).length;
          sendEvent("notifications", {
            unreadCount,
            notifications: enriched,
          });
        } catch {
          // Ignore transient query errors
        }
      };

      await pushSnapshot();

      // Stream updates every 4 seconds for 55 seconds (client EventSource auto-reconnects seamlessly)
      let ticks = 0;
      const interval = setInterval(async () => {
        ticks += 1;
        if (closed || ticks >= 14) {
          clearInterval(interval);
          try {
            controller.close();
          } catch {}
          return;
        }
        await pushSnapshot();
      }, 4000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
