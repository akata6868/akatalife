import { NextRequest } from "next/server";
import {
  PATCH as patchAdvice,
  DELETE as deleteAdvice,
} from "../../../advice/[id]/route";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/v1/agent/health-score/plan/{id}
 * Update status (OPEN, IN_PROGRESS, APPLIED, DISMISSED), priority, progress amounts, etc.
 */
export async function PATCH(req: NextRequest, context: Ctx) {
  return patchAdvice(req, context);
}

/**
 * DELETE /api/v1/agent/health-score/plan/{id}
 * Remove an item from the improvement plan.
 */
export async function DELETE(req: NextRequest, context: Ctx) {
  return deleteAdvice(req, context);
}
