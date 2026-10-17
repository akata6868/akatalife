"use client";

import React, { useEffect, useState } from "react";
import { Cpu, ShieldAlert, RefreshCw, CheckCircle2 } from "lucide-react";

interface SensorReading {
  entityId: string;
  state: string;
  unit: string | null;
  friendlyName: string | null;
  isAvailable: boolean;
  isStale: boolean;
}

export default function EnergyPage() {
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [entityListText, setEntityListText] = useState("");
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function loadEnergy() {
    const res = await fetch("/api/v1/agent/energy");
    if (!res.ok) return;
    const data = await res.json();
    setEnabled(Boolean(data.enabled));
    if (data.baseUrl) setBaseUrl(data.baseUrl);
    if (Array.isArray(data.selectedEntityIds)) {
      setEntityListText(data.selectedEntityIds.join(", "));
    }
    setSensors(data.sensors ?? []);
    setSyncedAt(data.syncedAtFormattedDe || data.lastSyncAtFormattedDe || null);
  }

  useEffect(() => {
    loadEnergy();
  }, []);

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);
    const entityIds = entityListText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/v1/agent/energy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        baseUrl,
        token: token || undefined,
        entityIds,
      }),
    });

    if (res.ok) {
      setToken("");
      setStatusMsg("Home-Assistant-Konfiguration verschlüsselt gespeichert.");
      await loadEnergy();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="w-6 h-6 text-teal-600" />
            Geräte & Energie (Home Assistant — Schreibgeschützt)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Optionale, serverseitige Read-Only-Integration. Access-Tokens verlassen niemals den Server.
          </p>
        </div>
        <button
          type="button"
          onClick={loadEnergy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Synchronisieren
        </button>
      </div>

      {!enabled && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            Standardmäßig deaktiviert (Keine erfundenen Sensordaten)
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Aktivieren Sie die Verbindung unten nur, wenn Sie Ihre echte Home-Assistant-Instanz anbinden möchten.
          </p>
        </div>
      )}

      {sensors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((s) => (
            <div
              key={s.entityId}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1"
            >
              <div className="text-xs text-slate-500">
                {s.friendlyName || s.entityId}
              </div>
              <div className="text-xl font-bold font-mono">
                {s.isAvailable
                  ? `${s.state}${s.unit ? ` ${s.unit}` : ""}`
                  : "Nicht verfügbar"}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {s.entityId} {s.isStale ? "(Veraltet)" : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSaveConfig}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Serverseitige Home Assistant Verbindung konfigurieren
          </h2>
          {syncedAt && (
            <span className="text-xs text-slate-500">
              Letzte Synchronisation: {syncedAt}
            </span>
          )}
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {statusMsg}
          </div>
        )}

        <label className="flex items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Home Assistant Read-Only Integration aktivieren
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Home Assistant Basis-URL
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://ha.example.com"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Long-Lived Access Token (wird AES-256-GCM verschlüsselt)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Neues Token eingeben…"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Sensor Entity-IDs (kommagetrennt)
          </label>
          <input
            value={entityListText}
            onChange={(e) => setEntityListText(e.target.value)}
            placeholder="sensor.wohnzimmer_temperatur, sensor.stromverbrauch_kwh"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold"
        >
          Konfiguration speichern
        </button>
      </form>
    </div>
  );
}
