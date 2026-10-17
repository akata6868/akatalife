import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto";
import { prisma } from "@/lib/db/prisma";
import {
  fetchHomeAssistantSensors,
  normalizeHomeAssistantBaseUrl,
} from "@/lib/home-assistant/client";
import { formatDateTimeDe } from "@/lib/format/date";

function parseSelectedEntityIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.homeAssistantConfig.findUnique({
      where: { id: "singleton" },
    });

    const envEnabled = process.env.HOME_ASSISTANT_ENABLED === "true";
    const enabled = Boolean(config?.enabled || envEnabled);
    const baseUrl = normalizeHomeAssistantBaseUrl(
      config?.baseUrl || process.env.HOME_ASSISTANT_URL || ""
    );

    let token = process.env.HOME_ASSISTANT_TOKEN || "";
    if (!token && config?.tokenEncrypted) {
      try {
        token = decryptSecret(config.tokenEncrypted);
      } catch {
        token = "";
      }
    }

    const selectedEntityIds = parseSelectedEntityIds(config?.selectedSensors);

    if (!enabled || !baseUrl || !token) {
      return NextResponse.json({
        enabled,
        configured: Boolean(baseUrl && token),
        hasToken: Boolean(token || config?.tokenEncrypted),
        baseUrl: baseUrl || null,
        selectedEntityIds,
        lastSyncAtFormattedDe: formatDateTimeDe(config?.lastSyncAt),
        lastSyncError: config?.lastSyncError ?? null,
        sensors: [],
        message: !baseUrl || !token
          ? "Home Assistant URL ve Long-Lived Access Token giriniz."
          : "Home Assistant entegrasyonu devre dışı.",
      });
    }

    const result = await fetchHomeAssistantSensors({
      baseUrl,
      token,
      entityIds: selectedEntityIds,
    });

    const finalEntityIds =
      selectedEntityIds.length > 0
        ? selectedEntityIds
        : (result.discoveredEntityIds ?? []);

    await prisma.homeAssistantConfig.upsert({
      where: { id: "singleton" },
      update: {
        lastSyncAt: result.ok ? new Date() : config?.lastSyncAt,
        lastSyncError: result.error ?? null,
        selectedSensors: finalEntityIds,
      },
      create: {
        id: "singleton",
        enabled: true,
        baseUrl,
        selectedSensors: finalEntityIds,
        lastSyncAt: result.ok ? new Date() : null,
        lastSyncError: result.error ?? null,
      },
    });

    return NextResponse.json({
      enabled: true,
      configured: true,
      hasToken: true,
      ok: result.ok,
      baseUrl,
      selectedEntityIds: finalEntityIds,
      syncedAt: result.syncedAt,
      syncedAtFormattedDe: formatDateTimeDe(result.syncedAt),
      error: result.error ?? null,
      sensors: result.sensors,
    });
  } catch (err) {
    return NextResponse.json(
      {
        enabled: false,
        ok: false,
        sensors: [],
        error:
          err instanceof Error
            ? err.message
            : "Home Assistant durumu okunurken hata oluştu.",
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "ValidationError" }, { status: 400 });
    }

    const enabled = Boolean(body.enabled);
    const rawUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
    const baseUrl = rawUrl ? normalizeHomeAssistantBaseUrl(rawUrl) : null;
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
        lastSyncError: null,
      },
      create: {
        id: "singleton",
        enabled,
        baseUrl,
        tokenEncrypted,
        selectedSensors: entityIds,
      },
    });

    // Also mirror into PluginIntegration (slug = 'home-assistant') so /plugins and /energy never drift
    const haPlugin = await prisma.pluginIntegration.findFirst({
      where: { slug: "home-assistant" },
    });
    if (haPlugin) {
      await prisma.pluginIntegration.update({
        where: { id: haPlugin.id },
        data: {
          enabled,
          baseUrl: baseUrl || "",
          ...(tokenEncrypted ? { apiKeyEncrypted: tokenEncrypted } : {}),
          status: enabled && baseUrl ? "CONNECTED" : "CONFIGURED",
          lastPingStatus: enabled
            ? "Enerji sayfasından güncellendi"
            : "Devre dışı",
        },
      });
    }

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
      hasToken: Boolean(tokenEncrypted),
      entityIds,
    });
  } catch (err) {
    return NextResponse.json(
      {
        saved: false,
        error:
          err instanceof Error
            ? err.message
            : "Home Assistant yapılandırması kaydedilirken hata oluştu.",
      },
      { status: 500 }
    );
  }
}
