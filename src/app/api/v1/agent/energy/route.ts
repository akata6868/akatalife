import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto";
import { prisma } from "@/lib/db/prisma";
import { fetchHomeAssistantSensors } from "@/lib/home-assistant/client";
import { formatDateTimeDe } from "@/lib/format/date";

export async function GET(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.homeAssistantConfig.findUnique({
    where: { id: "singleton" },
  });

  const envEnabled = process.env.HOME_ASSISTANT_ENABLED === "true";
  const enabled = Boolean(config?.enabled || envEnabled);
  const baseUrl = config?.baseUrl || process.env.HOME_ASSISTANT_URL || "";

  let token = process.env.HOME_ASSISTANT_TOKEN || "";
  if (!token && config?.tokenEncrypted) {
    try {
      token = decryptSecret(config.tokenEncrypted);
    } catch {
      token = "";
    }
  }

  const selectedEntityIds: string[] = Array.isArray(config?.selectedSensors)
    ? (config.selectedSensors as string[])
    : [];

  if (!enabled || !baseUrl || !token || selectedEntityIds.length === 0) {
    return NextResponse.json({
      enabled: false,
      configured: Boolean(baseUrl && token),
      baseUrl: baseUrl || null,
      selectedEntityIds,
      lastSyncAtFormattedDe: formatDateTimeDe(config?.lastSyncAt),
      sensors: [],
      message:
        "Home Assistant Integration ist deaktiviert oder noch nicht mit Sensor-Entitäten konfiguriert.",
    });
  }

  const result = await fetchHomeAssistantSensors({
    baseUrl,
    token,
    entityIds: selectedEntityIds,
  });

  await prisma.homeAssistantConfig.upsert({
    where: { id: "singleton" },
    update: {
      lastSyncAt: result.ok ? new Date() : config?.lastSyncAt,
      lastSyncError: result.error ?? null,
    },
    create: {
      id: "singleton",
      enabled: true,
      baseUrl,
      lastSyncAt: result.ok ? new Date() : null,
      lastSyncError: result.error ?? null,
    },
  });

  return NextResponse.json({
    enabled: true,
    ok: result.ok,
    syncedAt: result.syncedAt,
    syncedAtFormattedDe: formatDateTimeDe(result.syncedAt),
    error: result.error ?? null,
    sensors: result.sensors,
  });
}

export async function POST(req: NextRequest) {
  const actor = await authenticateRequestActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "ValidationError" }, { status: 400 });
  }

  const enabled = Boolean(body.enabled);
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : null;
  const rawToken =
    typeof body.token === "string" && body.token.trim().length > 0
      ? body.token.trim()
      : null;
  const entityIds = Array.isArray(body.entityIds)
    ? body.entityIds.map((id: unknown) => String(id).trim()).filter(Boolean)
    : [];

  const existing = await prisma.homeAssistantConfig.findUnique({
    where: { id: "singleton" },
  });

  const tokenEncrypted = rawToken
    ? encryptSecret(rawToken)
    : (existing?.tokenEncrypted ?? null);

  await prisma.homeAssistantConfig.upsert({
    where: { id: "singleton" },
    update: {
      enabled,
      baseUrl,
      tokenEncrypted,
      selectedSensors: entityIds,
    },
    create: {
      id: "singleton",
      enabled,
      baseUrl,
      tokenEncrypted,
      selectedSensors: entityIds,
    },
  });

  await recordAuditEvent({
    actor,
    action: "HOME_ASSISTANT_CONFIG_UPDATED",
    entityType: "HomeAssistantConfig",
    entityId: "singleton",
    metadata: { enabled, baseUrl, entityCount: entityIds.length },
  });

  return NextResponse.json({
    saved: true,
    enabled,
    baseUrl,
    entityIds,
  });
}
