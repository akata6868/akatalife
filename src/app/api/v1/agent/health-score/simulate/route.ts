import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestActor } from "@/lib/auth/session";
import { GET as getHealthScore } from "../route";

const SimulateSchema = z.object({
  expenseCutEur: z.number().min(0).max(5000).default(0),
  incomeBoostEur: z.number().min(0).max(20000).default(0),
  contractDiscount15: z.boolean().default(false),
  optimizeEnergy: z.boolean().default(false),
});

function classFromPercent(p: number): string {
  if (p >= 96.0) return "A+";
  if (p >= 92.5) return "A";
  if (p >= 87.5) return "B";
  if (p >= 80.0) return "C";
  return "D";
}

/**
 * POST /api/v1/agent/health-score/simulate
 * What-if scenario for Hermes Agent: how would the monthly financial health score
 * change if expenses are cut / income grows / contracts are renegotiated / energy is optimized.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = SimulateSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ValidationError", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const sim = parsed.data;

    const baseRes = await getHealthScore(req);
    const base = await baseRes.json();
    if (!baseRes.ok) {
      return NextResponse.json(base, { status: baseRes.status });
    }

    const contractSaveEur = sim.contractDiscount15
      ? Math.round((base.metrics.monthlyContractLoadCents / 100) * 0.15)
      : 0;
    const energySaveEur = sim.optimizeEnergy
      ? Math.max(15, Math.round((base.metrics.monthlyEnergyCents / 100) * 0.14))
      : 0;
    const totalMonthlyGainEur =
      sim.expenseCutEur + sim.incomeBoostEur + contractSaveEur + energySaveEur;

    let bonusPoints = 0;
    let bonusPercent = 0;
    if (sim.expenseCutEur > 0) {
      const pts = Math.round(Math.min(45, sim.expenseCutEur * 0.12));
      bonusPoints += pts;
      bonusPercent += pts * 0.04;
    }
    if (sim.incomeBoostEur > 0) {
      const pts = Math.round(Math.min(45, sim.incomeBoostEur * 0.045));
      bonusPoints += pts;
      bonusPercent += pts * 0.038;
    }
    if (sim.contractDiscount15) {
      bonusPoints += 18;
      bonusPercent += 0.75;
    }
    if (sim.optimizeEnergy) {
      bonusPoints += 14;
      bonusPercent += 0.55;
    }

    const newPoints = Math.min(
      base.score.maxPoints,
      base.score.schufaPoints + bonusPoints
    );
    const newPercent =
      Math.round(Math.min(99.9, base.score.schufaPercent + bonusPercent) * 100) /
      100;

    return NextResponse.json({
      scenario: sim,
      current: {
        schufaPercent: base.score.schufaPercent,
        schufaPoints: base.score.schufaPoints,
        ratingClass: base.score.ratingClass,
        netMonthlyCashflowFormattedDe: base.metrics.netMonthlyCashflowFormattedDe,
      },
      simulated: {
        schufaPercent: newPercent,
        schufaPoints: newPoints,
        ratingClass: classFromPercent(newPercent),
        bonusPoints,
        bonusPercent: Math.round(bonusPercent * 100) / 100,
        contractSaveEur,
        energySaveEur,
        totalMonthlyGainEur,
        yearlyExtraSavingsEur: totalMonthlyGainEur * 12,
        newMonthlyNetEur:
          Math.round(
            (base.metrics.netMonthlyCashflowCents / 100 + totalMonthlyGainEur) *
              100
          ) / 100,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Simulation could not be computed.",
      },
      { status: 500 }
    );
  }
}
