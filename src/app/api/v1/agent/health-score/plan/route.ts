import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { GET as getHealthScore } from "../route";
import {
  GET as listAdvice,
  POST as createAdvice,
} from "../../advice/route";

const AddFromRecommendationSchema = z.object({
  recommendationId: z.string().min(1),
});

/**
 * GET /api/v1/agent/health-score/plan
 * Lists the saved improvement plan items (stored as advice entries).
 */
export async function GET(req: NextRequest) {
  return listAdvice(req);
}

/**
 * POST /api/v1/agent/health-score/plan
 * Adds an item to the improvement plan. Two modes:
 *  1) { "recommendationId": "rec-optimize-contracts" }  -> copies a computed score recommendation
 *  2) a custom item: { title, summary, category, priority, actionSteps, monthlySavingsEur ... }
 */
export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "ValidationError" }, { status: 400 });
  }

  let payload: Record<string, unknown> = body as Record<string, unknown>;

  const fromRec = AddFromRecommendationSchema.safeParse(body);
  if (fromRec.success) {
    const scoreRes = await getHealthScore(req);
    const score = await scoreRes.json();
    if (!scoreRes.ok) {
      return NextResponse.json(score, { status: scoreRes.status });
    }
    const rec = (score.recommendations ?? []).find(
      (r: any) => r.id === fromRec.data.recommendationId
    );
    if (!rec) {
      return NextResponse.json(
        {
          error: "RecommendationNotFound",
          message: "Unknown recommendationId.",
          availableIds: (score.recommendations ?? []).map((r: any) => r.id),
        },
        { status: 404 }
      );
    }
    const allowed = [
      "SAVINGS",
      "WEALTH",
      "CONTRACT_OPTIMIZATION",
      "BUDGET",
      "DEBT_PAYOFF",
      "GENERAL",
    ];
    payload = {
      title: rec.title,
      category: allowed.includes(rec.category) ? rec.category : "SAVINGS",
      priority: rec.priority,
      status: "OPEN",
      summary: rec.description,
      actionSteps: rec.actionSteps,
      monthlySavingsCents: rec.estimatedMonthlySavingsCents,
    };
  }

  const forwarded = new NextRequest(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(payload),
  });
  return createAdvice(forwarded);
}
