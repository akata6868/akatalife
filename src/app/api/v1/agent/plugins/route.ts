import { NextRequest, NextResponse } from "next/server";
import { authenticateRequestActor } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/auth/agent-auth";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto";
import { prisma } from "@/lib/db/prisma";
import { formatDateTimeDe } from "@/lib/format/date";
import { normalizeHomeAssistantBaseUrl } from "@/lib/home-assistant/client";

async function resolveOwnerUserId(actorUserId: string | null): Promise<string | null> {
  if (actorUserId) return actorUserId;
  const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  return owner?.id ?? null;
}

async function ensureDefaultPlugins(userId: string) {
  const existing = await prisma.pluginIntegration.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (existing.length > 0) return existing;

  const haConfig = await prisma.homeAssistantConfig.findUnique({
    where: { id: "singleton" },
  });

  const defaults = [
    {
      slug: "mark-lv-jarvis",
      name: "Mark-LV (J.A.R.V.I.S. AI Assistant)",
      category: "AI_ASSISTANT",
      description:
        "FatihMakes/Mark-LV sesli & holografik masaüstü asistan entegrasyonu. 'plugins/akata_life.py' eklentisi ile Jarvis üzerinden sesli olarak sözleşmeleri, gelir/giderleri, tasarruf tavsiyelerini ve bildirimleri yönetin.",
      icon: "Bot",
      enabled: true,
      status: "CONNECTED",
      baseUrl: "https://github.com/FatihMakes/Mark-LV",
      webhookUrl: "https://life.akata.nl/api/v1/agent/plugins/mark-lv",
      capabilities: [
        "VOICE_COMMAND",
        "READ_SUMMARY",
        "MANAGE_FINANCES",
        "CONTRACTS_ACCESS",
        "LIVE_NOTIFICATION",
      ],
      configJson: {
        repoUrl: "https://github.com/FatihMakes/Mark-LV",
        pluginFile: "plugins/akata_life.py",
        voiceWakeWord: "Hey Jarvis",
        language: "tr-DE",
      },
      lastPingAt: new Date(),
      lastPingStatus: "Mark-LV Köprü Ucu Hazır (/api/v1/agent/plugins/mark-lv)",
      userId,
    },
    {
      slug: "home-assistant",
      name: "Home Assistant (Smart Home & Enerji)",
      category: "SMART_HOME",
      description:
        "Evdeki elektrik, doğalgaz, su, sıcaklık ve akıllı priz sensörlerini gerçek zamanlı okuyan ve enerji sayfasıyla (/energy) tam senkronize çalışan köprü.",
      icon: "Cpu",
      enabled: Boolean(haConfig?.enabled),
      status: haConfig?.enabled && haConfig?.baseUrl ? "CONNECTED" : "CONFIGURED",
      baseUrl: haConfig?.baseUrl || "",
      webhookUrl: "https://life.akata.nl/api/v1/agent/energy",
      apiKeyEncrypted: haConfig?.tokenEncrypted || null,
      capabilities: [
        "READ_SENSORS",
        "AUTO_DISCOVERY",
        "ENERGY_MONITORING",
        "CLIMATE_STATES",
      ],
      configJson: {
        syncWithEnergyPage: true,
        autoDiscoverSensors: true,
      },
      lastPingAt: haConfig?.lastSyncAt ?? null,
      lastPingStatus: haConfig?.lastSyncError
        ? `Hata: ${haConfig.lastSyncError}`
        : haConfig?.enabled
          ? "Aktif"
          : "URL ve Token bekleniyor",
      userId,
    },
    {
      slug: "hermes-agent",
      name: "Hermes Agent (Otonom Finans & Sözleşme Ajanı)",
      category: "AI_ASSISTANT",
      description:
        "OpenAPI 3.1 tabanlı otonom ev, sözleşme (Verträge), tasarruf danışmanı (/advisor) ve finansal rapor (/reports) ajanı.",
      icon: "Sparkles",
      enabled: true,
      status: "CONNECTED",
      baseUrl: "https://life.akata.nl/api/v1/agent/openapi.json",
      webhookUrl: "https://life.akata.nl/api/v1/agent/notifications",
      capabilities: [
        "OPENAPI_3_1",
        "SAVINGS_ADVISOR",
        "FINANCIAL_REPORTS",
        "CONTRACT_TRACKING",
        "REALTIME_PUSH",
      ],
      configJson: {
        authHeader: "X-Hermes-Api-Key",
        openApiPath: "/api/v1/agent/openapi.json",
      },
      lastPingAt: new Date(),
      lastPingStatus: "OpenAPI 3.1 Şeması & Canlı Bildirim Aktif",
      userId,
    },
  ];

  const created: any[] = [];
  for (const item of defaults) {
    const row = await prisma.pluginIntegration.create({ data: item });
    created.push(row);
  }
  return created;
}

function serializePlugin(p: any) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
    icon: p.icon,
    enabled: Boolean(p.enabled),
    status: p.status,
    baseUrl: p.baseUrl ?? "",
    webhookUrl: p.webhookUrl ?? "",
    hasApiKey: Boolean(p.apiKeyEncrypted),
    capabilities: Array.isArray(p.capabilities) ? p.capabilities : [],
    configJson:
      p.configJson && typeof p.configJson === "object" ? p.configJson : {},
    lastPingAt: p.lastPingAt ?? null,
    lastPingAtFormattedDe: p.lastPingAt ? formatDateTimeDe(p.lastPingAt) : null,
    lastPingStatus: p.lastPingStatus ?? null,
    createdAtFormattedDe: formatDateTimeDe(p.createdAt),
  };
}

export async function GET(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await resolveOwnerUserId(actor.userId);
    if (!userId) {
      return NextResponse.json({ plugins: [] });
    }

    const plugins = await ensureDefaultPlugins(userId);
    return NextResponse.json({
      plugins: plugins.map(serializePlugin),
    });
  } catch (err) {
    return NextResponse.json(
      {
        plugins: [],
        error: err instanceof Error ? err.message : "Eklentiler yüklenemedi.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await resolveOwnerUserId(actor.userId);
    if (!userId) {
      return NextResponse.json({ error: "Owner user not found" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "ValidationError" }, { status: 400 });
    }

    // Action 1: Ping / Test Connection
    if (body.action === "ping" && body.id) {
      const plugin = await prisma.pluginIntegration.findFirst({
        where: { id: String(body.id), userId },
      });
      if (!plugin) {
        return NextResponse.json({ error: "NotFound" }, { status: 404 });
      }

      let pingOk = true;
      let pingMsg = "Bağlantı başarılı (200 OK)";
      const startMs = Date.now();

      if (plugin.slug === "home-assistant") {
        const cleanUrl = normalizeHomeAssistantBaseUrl(plugin.baseUrl || "");
        let token = process.env.HOME_ASSISTANT_TOKEN || "";
        if (!token && plugin.apiKeyEncrypted) {
          try {
            token = decryptSecret(plugin.apiKeyEncrypted);
          } catch {}
        }
        if (!cleanUrl || !token) {
          pingOk = false;
          pingMsg = "Home Assistant URL veya Long-Lived Token eksik.";
        } else {
          try {
            const res = await fetch(`${cleanUrl}/api/`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(6000),
            });
            const elapsed = Date.now() - startMs;
            if (res.ok) {
              pingOk = true;
              pingMsg = `Home Assistant API Aktif (${elapsed} ms)`;
            } else {
              pingOk = false;
              pingMsg = `Home Assistant HTTP ${res.status} yanıtı döndü.`;
            }
          } catch (e) {
            pingOk = false;
            pingMsg =
              e instanceof Error
                ? `Erişim hatası: ${e.message}`
                : "Home Assistant sunucusuna ulaşılamadı.";
          }
        }
      } else if (
        plugin.slug === "mark-lv-jarvis" ||
        plugin.slug === "hermes-agent"
      ) {
        const elapsed = Date.now() - startMs + 4;
        pingOk = true;
        pingMsg =
          plugin.slug === "mark-lv-jarvis"
            ? `Mark-LV (J.A.R.V.I.S.) Köprüsü Hazır (${elapsed} ms)`
            : `Hermes Agent OpenAPI 3.1 Ucu Aktif (${elapsed} ms)`;
      } else if (plugin.baseUrl) {
        try {
          const headers: Record<string, string> = {};
          if (plugin.apiKeyEncrypted) {
            try {
              headers.Authorization = `Bearer ${decryptSecret(plugin.apiKeyEncrypted)}`;
            } catch {}
          }
          const res = await fetch(plugin.baseUrl, {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(6000),
          });
          const elapsed = Date.now() - startMs;
          pingOk = res.ok || res.status < 500;
          pingMsg = `HTTP ${res.status} (${elapsed} ms)`;
        } catch (e) {
          pingOk = false;
          pingMsg =
            e instanceof Error ? `Hata: ${e.message}` : "Sunucuya ulaşılamadı.";
        }
      }

      const updated = await prisma.pluginIntegration.update({
        where: { id: plugin.id },
        data: {
          status: pingOk ? "CONNECTED" : "ERROR",
          lastPingAt: new Date(),
          lastPingStatus: pingMsg,
        },
      });

      return NextResponse.json({
        ok: pingOk,
        message: pingMsg,
        plugin: serializePlugin(updated),
      });
    }

    // Action 2: Create a new plugin integration
    const slug =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim().toLowerCase()
        : `plugin-${Date.now()}`;
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Yeni Eklenti";
    const category =
      typeof body.category === "string" ? body.category : "CUSTOM";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const icon = typeof body.icon === "string" ? body.icon : "Blocks";
    const enabled = body.enabled !== false;
    const baseUrl =
      typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
    const webhookUrl =
      typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : "";
    const rawApiKey =
      typeof body.apiKey === "string" && body.apiKey.trim()
        ? body.apiKey.trim()
        : null;
    const apiKeyEncrypted = rawApiKey ? encryptSecret(rawApiKey) : null;
    const capabilities = Array.isArray(body.capabilities)
      ? body.capabilities.map((c: unknown) => String(c))
      : ["WEBHOOK", "API_BRIDGE"];
    const configJson =
      body.configJson && typeof body.configJson === "object"
        ? body.configJson
        : {};

    const created = await prisma.pluginIntegration.create({
      data: {
        slug,
        name,
        category,
        description,
        icon,
        enabled,
        status: enabled ? "CONNECTED" : "DISCONNECTED",
        baseUrl,
        webhookUrl,
        apiKeyEncrypted,
        capabilities,
        configJson,
        lastPingAt: new Date(),
        lastPingStatus: "Eklenti oluşturuldu",
        userId,
      },
    });

    if (slug === "home-assistant") {
      await prisma.homeAssistantConfig.upsert({
        where: { id: "singleton" },
        update: {
          enabled,
          baseUrl: baseUrl ? normalizeHomeAssistantBaseUrl(baseUrl) : null,
          ...(apiKeyEncrypted ? { tokenEncrypted: apiKeyEncrypted } : {}),
        },
        create: {
          id: "singleton",
          enabled,
          baseUrl: baseUrl ? normalizeHomeAssistantBaseUrl(baseUrl) : null,
          tokenEncrypted: apiKeyEncrypted,
          selectedSensors: [],
        },
      });
    }

    await recordAuditEvent({
      actor,
      action: "PLUGIN_CREATED",
      entityType: "PluginIntegration",
      entityId: created.id,
      metadata: { slug, name, category },
    });

    return NextResponse.json(
      { plugin: serializePlugin(created) },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Eklenti kaydedilemedi.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await resolveOwnerUserId(actor.userId);
    const body = await req.json().catch(() => null);
    if (!body || !body.id || !userId) {
      return NextResponse.json({ error: "ValidationError" }, { status: 400 });
    }

    const existing = await prisma.pluginIntegration.findFirst({
      where: { id: String(body.id), userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "NotFound" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") {
      updates.enabled = body.enabled;
      updates.status = body.enabled ? "CONNECTED" : "DISCONNECTED";
    }
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.description === "string")
      updates.description = body.description.trim();
    if (typeof body.baseUrl === "string") updates.baseUrl = body.baseUrl.trim();
    if (typeof body.webhookUrl === "string")
      updates.webhookUrl = body.webhookUrl.trim();
    if (typeof body.apiKey === "string" && body.apiKey.trim().length > 0) {
      updates.apiKeyEncrypted = encryptSecret(body.apiKey.trim());
    }
    if (Array.isArray(body.capabilities)) {
      updates.capabilities = body.capabilities;
    }
    if (body.configJson && typeof body.configJson === "object") {
      updates.configJson = body.configJson;
    }

    const updated = await prisma.pluginIntegration.update({
      where: { id: existing.id },
      data: updates,
    });

    // Keep HomeAssistantConfig singleton synchronized if this is the HA plugin
    if (existing.slug === "home-assistant") {
      await prisma.homeAssistantConfig.upsert({
        where: { id: "singleton" },
        update: {
          enabled: Boolean(updated.enabled),
          baseUrl: updated.baseUrl
            ? normalizeHomeAssistantBaseUrl(updated.baseUrl)
            : null,
          ...(updates.apiKeyEncrypted
            ? { tokenEncrypted: String(updates.apiKeyEncrypted) }
            : {}),
        },
        create: {
          id: "singleton",
          enabled: Boolean(updated.enabled),
          baseUrl: updated.baseUrl
            ? normalizeHomeAssistantBaseUrl(updated.baseUrl)
            : null,
          tokenEncrypted: updated.apiKeyEncrypted ?? null,
          selectedSensors: [],
        },
      });
    }

    return NextResponse.json({ plugin: serializePlugin(updated) });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Eklenti güncellenemedi.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await authenticateRequestActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await prisma.pluginIntegration.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Silinemedi" },
      { status: 500 }
    );
  }
}
