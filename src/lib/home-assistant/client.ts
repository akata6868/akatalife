/**
 * Read-Only Server-Side Home Assistant Client (Milestone 6).
 * - Disabled until explicitly configured.
 * - Never exposes access tokens to the client browser.
 * - Supports both explicit entityIds and automatic sensor discovery from /api/states.
 */

export interface HomeAssistantSensorState {
  entityId: string;
  state: string;
  numericValue: number | null;
  unit: string | null;
  friendlyName: string | null;
  deviceClass: string | null;
  lastUpdated: string | null;
  isAvailable: boolean;
  isStale: boolean;
}

const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

export function normalizeHomeAssistantBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

function humanizeEntityId(entityId: string, rawFriendlyName: string | null): string {
  const cleanFriendly = (rawFriendlyName ?? "").trim();
  // If HA returned a generic name like "sensor Cost" or empty, build a nicer label from entity_id
  if (
    cleanFriendly &&
    cleanFriendly.toLowerCase() !== "sensor cost" &&
    cleanFriendly.toLowerCase() !== "cost" &&
    cleanFriendly !== entityId
  ) {
    return cleanFriendly;
  }

  const slug = entityId
    .replace(/^sensor\./i, "")
    .replace(/^e3_vitodens_\d+_\d+_/i, "Vitodens ")
    .replace(/^ww_/i, "Warmwasser ")
    .replace(/_/g, " ");

  return slug.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseHomeAssistantStatePayload(
  raw: {
    entity_id?: string;
    state?: string;
    last_updated?: string;
    attributes?: Record<string, unknown>;
  },
  referenceNow = new Date()
): HomeAssistantSensorState {
  const entityId = String(raw.entity_id ?? "");
  const stateStr = String(raw.state ?? "unavailable");
  const unavailable =
    stateStr === "unavailable" ||
    stateStr === "unknown" ||
    stateStr.trim() === "";

  const parsedNum = unavailable ? NaN : Number(stateStr);
  const numericValue = Number.isFinite(parsedNum)
    ? Math.round(parsedNum * 100) / 100
    : null;

  const formattedState =
    numericValue !== null
      ? Number.isInteger(numericValue)
        ? String(numericValue)
        : numericValue.toFixed(2).replace(/\.?0+$/, "")
      : stateStr;

  const lastUpdated = raw.last_updated ? String(raw.last_updated) : null;
  let isStale = false;
  if (lastUpdated) {
    const updatedTime = new Date(lastUpdated).getTime();
    if (
      !Number.isNaN(updatedTime) &&
      referenceNow.getTime() - updatedTime > STALE_THRESHOLD_MS
    ) {
      isStale = true;
    }
  }

  const unit =
    typeof raw.attributes?.unit_of_measurement === "string"
      ? raw.attributes.unit_of_measurement
      : null;
  const rawFriendlyName =
    typeof raw.attributes?.friendly_name === "string"
      ? raw.attributes.friendly_name
      : null;
  const deviceClass =
    typeof raw.attributes?.device_class === "string"
      ? raw.attributes.device_class
      : null;

  return {
    entityId,
    state: formattedState,
    numericValue,
    unit,
    friendlyName: humanizeEntityId(entityId, rawFriendlyName),
    deviceClass,
    lastUpdated,
    isAvailable: !unavailable,
    isStale,
  };
}

const PREFERRED_DEVICE_CLASSES = new Set([
  "energy",
  "power",
  "temperature",
  "humidity",
  "gas",
  "water",
  "battery",
  "voltage",
  "current",
  "monetary",
]);

export async function fetchHomeAssistantSensors(params: {
  baseUrl: string;
  token: string;
  entityIds: string[];
  timeoutMs?: number;
}): Promise<{
  ok: boolean;
  syncedAt: string;
  sensors: HomeAssistantSensorState[];
  catalog?: HomeAssistantSensorState[];
  discoveredEntityIds?: string[];
  error?: string;
}> {
  const cleanBaseUrl = normalizeHomeAssistantBaseUrl(params.baseUrl);
  const timeoutMs =
    params.timeoutMs ??
    parseInt(process.env.HOME_ASSISTANT_TIMEOUT_MS ?? "8000", 10);

  const sensors: HomeAssistantSensorState[] = [];

  if (!cleanBaseUrl || !params.token) {
    return {
      ok: false,
      syncedAt: new Date().toISOString(),
      sensors: [],
      error: "Home Assistant URL veya Access Token eksik.",
    };
  }

  try {
    const res = await fetch(`${cleanBaseUrl}/api/states`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        syncedAt: new Date().toISOString(),
        sensors: [],
        error: `Home Assistant kimlik doğrulama hatası (HTTP ${res.status}). Lütfen Long-Lived Access Token (eyJ... ile başlayan uzun token) bilginizi kontrol edin.`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        syncedAt: new Date().toISOString(),
        sensors: [],
        error: `Home Assistant yanıt hatası (HTTP ${res.status}). URL ve Long-Lived Access Token bilgisini kontrol edin.`,
      };
    }

    const allStates = await res.json();
    if (!Array.isArray(allStates)) {
      return {
        ok: false,
        syncedAt: new Date().toISOString(),
        sensors: [],
        error: "Home Assistant /api/states geçerli bir liste döndürmedi.",
      };
    }

    const isStateAvailable = (item: any) => {
      const st = String(item?.state ?? "").trim().toLowerCase();
      return st !== "" && st !== "unavailable" && st !== "unknown";
    };

    const allSensorItems = allStates.filter((item: any) =>
      String(item?.entity_id ?? "").startsWith("sensor.")
    );

    const catalog: HomeAssistantSensorState[] = allSensorItems
      .map((raw: any) => parseHomeAssistantStatePayload(raw))
      .sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
        return (a.friendlyName || a.entityId).localeCompare(
          b.friendlyName || b.entityId
        );
      });

    // If no specific entityIds were provided, auto-discover AVAILABLE sensors
    if (params.entityIds.length === 0) {
      const availableSensors = allSensorItems.filter(isStateAvailable);

      const prioritized = availableSensors.filter((item: any) => {
        const dc = String(item?.attributes?.device_class ?? "").toLowerCase();
        const unit = item?.attributes?.unit_of_measurement;
        return PREFERRED_DEVICE_CLASSES.has(dc) || typeof unit === "string";
      });

      const chosen = (
        prioritized.length > 0 ? prioritized : availableSensors
      ).slice(0, 24);

      for (const raw of chosen) {
        sensors.push(parseHomeAssistantStatePayload(raw));
      }

      return {
        ok: true,
        syncedAt: new Date().toISOString(),
        sensors,
        catalog,
        discoveredEntityIds: sensors.map((s) => s.entityId),
      };
    }

    // Explicit entityIds list provided: match from allStates map in O(1)
    const stateMap = new Map<string, any>();
    for (const item of allStates) {
      if (item?.entity_id) {
        stateMap.set(String(item.entity_id).toLowerCase(), item);
      }
    }

    for (const rawId of params.entityIds) {
      const entityId = rawId.trim();
      if (!entityId || !entityId.includes(".")) {
        continue;
      }
      const found = stateMap.get(entityId.toLowerCase());
      if (!found) {
        sensors.push({
          entityId,
          state: "unavailable",
          numericValue: null,
          unit: null,
          friendlyName: humanizeEntityId(entityId, null),
          deviceClass: null,
          lastUpdated: null,
          isAvailable: false,
          isStale: false,
        });
        continue;
      }
      sensors.push(parseHomeAssistantStatePayload(found));
    }

    return {
      ok: true,
      syncedAt: new Date().toISOString(),
      sensors,
      catalog,
    };
  } catch (err) {
    return {
      ok: false,
      syncedAt: new Date().toISOString(),
      sensors,
      error:
        err instanceof Error
          ? `Bağlantı hatası: ${err.message}`
          : "Home Assistant sunucusuna ulaşılamadı veya zaman aşımına uğradı.",
    };
  }
}
