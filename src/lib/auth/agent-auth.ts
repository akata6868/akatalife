import { NextRequest } from "next/server";
import { constantTimeEqualStrings, sha256Hex } from "./crypto";
import { prisma } from "@/lib/db/prisma";

export interface AuthenticatedActor {
  actorType: "USER" | "HERMES_AGENT";
  actorLabel: string;
  userId: string;
  scopes: string[];
}

/**
 * Extracts a Bearer token or X-Hermes-Api-Key from incoming headers.
 */
export function extractAgentApiKey(req: NextRequest | Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const customHeader = req.headers.get("x-hermes-api-key");
  if (customHeader?.trim()) {
    return customHeader.trim();
  }
  return null;
}

/**
 * Verifies a Hermes Agent API key against:
 * 1) Environment variable HERMES_AGENT_API_KEY (bound to the primary OWNER user)
 * 2) Or an active AgentApiKey record in Supabase PostgreSQL
 */
export async function authenticateHermesAgent(
  req: NextRequest | Request
): Promise<AuthenticatedActor | null> {
  if (process.env.HERMES_AGENT_ENABLED === "false") {
    return null;
  }

  const providedKey = extractAgentApiKey(req);
  if (!providedKey || providedKey.length < 16) {
    return null;
  }

  const envKey = process.env.HERMES_AGENT_API_KEY;
  if (
    envKey &&
    envKey.length >= 16 &&
    !envKey.startsWith("REPLACE_WITH_") &&
    constantTimeEqualStrings(providedKey, envKey)
  ) {
    const owner = await prisma.user.findFirst({
      where: { role: "OWNER" },
      orderBy: { createdAt: "asc" },
    });
    if (!owner) {
      throw new Error(
        "HERMES_AGENT_API_KEY is valid, but no OWNER user exists in database yet."
      );
    }
    return {
      actorType: "HERMES_AGENT",
      actorLabel: "Hermes Agent (Env Key)",
      userId: owner.id,
      scopes: ["*"],
    };
  }

  const keyHash = sha256Hex(providedKey);
  const dbKey = await prisma.agentApiKey.findUnique({
    where: { keyHash },
  });

  if (!dbKey || !dbKey.active) {
    return null;
  }

  if (dbKey.expiresAt && dbKey.expiresAt.getTime() < Date.now()) {
    return null;
  }

  await prisma.agentApiKey.update({
    where: { id: dbKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    actorType: "HERMES_AGENT",
    actorLabel: dbKey.name,
    userId: dbKey.userId,
    scopes: dbKey.scopes,
  };
}

/**
 * Records an audit trail event for Hermes Agent or Owner mutations.
 */
export async function recordAuditEvent(params: {
  actor: AuthenticatedActor;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await prisma.auditEvent.create({
    data: {
      actorType: params.actor.actorType,
      actorLabel: params.actor.actorLabel,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ? (params.metadata as object) : undefined,
      ipAddress: params.ipAddress ?? null,
      userId: params.actor.userId,
    },
  });
}
