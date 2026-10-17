/**
 * Read-Only Server-Side Home Assistant Client (Milestone 6).
 * - Disabled until explicitly configured.
 * - Never exposes access tokens to the client browser.
 * - Enforces strict timeouts and treats "unavailable" / "unknown" states as unavailable.
 */

export interface HomeAssistantSensorState {
  entityId: string;
  state: string;
  numericValue: number | null;
  unit: string | null;
  friendlyName: string | null;
  lastUpdated: string | null;
  isAvailable: boolean;
  isStale: boolean;
}

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

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
  const numericValue = Number.isFinite(parsedNum) ? parsedNum : null;

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
  const friendlyName =
    typeof raw.attributes?.friendly_name === "string"
      ? raw.attributes.friendly_name
      : null;

  return {
    entityId,
    state: stateStr,
    numericValue,
    unit,
    friendlyName,
    lastUpdated,
    isAvailable: !unavailable && !isStale,
    isStale,
  };
}

export async function fetchHomeAssistantSensors(params: {
  baseUrl: string;
  token: string;
  entityIds: string[];
  timeoutMs?: number;
}): Promise<{
  ok: boolean;
  syncedAt: string;
  sensors: HomeAssistantSensorState[];
  error?: string;
}> {
  const cleanBaseUrl = params.baseUrl.replace(/\/+$/, "");
  const timeoutMs =
    params.timeoutMs ??
    parseInt(process.env.HOME_ASSISTANT_TIMEOUT_MS ?? "5000", 10);

  const sensors: HomeAssistantSensorState[] = [];

  try {
    for (const entityId of params.entityIds) {
      if (!/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(entityId)) {
        continue;
      }
      const res = await fetch(
        `${cleanBaseUrl}/api/states/${encodeURIComponent(entityId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${params.token}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(timeoutMs),
          cache: "no-store",
        }
      );

      if (!res.ok) {
        sensors.push({
          entityId,
          state: "unavailable",
          numericValue: null,
          unit: null,
          friendlyName: entityId,
          lastUpdated: null,
          isAvailable: false,
          isStale: false,
        });
        continue;
      }

      const payload = await res.json();
      sensors.push(parseHomeAssistantStatePayload(payload));
    }

    return {
      ok: true,
      syncedAt: new Date().toISOString(),
      sensors,
    };
  } catch (err) {
    return {
      ok: false,
      syncedAt: new Date().toISOString(),
      sensors,
      error:
        err instanceof Error
          ? err.message
          : "Home Assistant connection failed or timed out",
    };
  }
}
