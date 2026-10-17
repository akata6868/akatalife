"use client";

import React, { useEffect, useState } from "react";
import {
  Cpu,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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
  const [hasToken, setHasToken] = useState(false);
  const [entityListText, setEntityListText] = useState("");
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadEnergy() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/agent/energy", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(
          data.error || `Sunucu hatası (HTTP ${res.status})`
        );
        return;
      }
      setEnabled(Boolean(data.enabled));
      setHasToken(Boolean(data.hasToken));
      if (data.baseUrl) setBaseUrl(data.baseUrl);
      if (Array.isArray(data.selectedEntityIds)) {
        setEntityListText(data.selectedEntityIds.join(", "));
      }
      setSensors(data.sensors ?? []);
      setSyncedAt(
        data.syncedAtFormattedDe || data.lastSyncAtFormattedDe || null
      );
      if (data.error) {
        setErrorMsg(data.error);
      } else if (data.lastSyncError && data.enabled) {
        setErrorMsg(data.lastSyncError);
      }
    } catch {
      setErrorMsg("Home Assistant verileri alınırken bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnergy();
  }, []);

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);

    const entityIds = entityListText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.saved === false) {
        setErrorMsg(
          data.error || "Home Assistant yapılandırması kaydedilemedi."
        );
        return;
      }

      setToken("");
      setHasToken(Boolean(data.hasToken));
      setStatusMsg(
        "✓ Home Assistant yapılandırması şifrelenerek kaydedildi ve senkronize edildi."
      );
      await loadEnergy();
    } catch {
      setErrorMsg("Kaydetme sırasında ağ hatası oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="w-6 h-6 text-teal-600" />
            Geräte & Energie (Home Assistant Entegrasyonu)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sunucu tabanlı güvenli bağlantı. Access-Token AES-256-GCM ile şifrelenir; sensörler otomatik keşfedilir.
          </p>
        </div>
        <button
          type="button"
          onClick={loadEnergy}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Synchronisieren (Yenile)
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Home Assistant Bağlantı Uyarısı</div>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {statusMsg && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{statusMsg}</span>
        </div>
      )}

      {!enabled && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            Home Assistant Bağlantısı Kapalı
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Aşağıdaki formdan <strong>&quot;Home Assistant Read-Only Integration aktivieren&quot;</strong> kutucuğunu işaretleyip URL ve Long-Lived Access Token bilginizi kaydedin. Sensör listesini boş bırakırsanız sistem tüm enerji/sıcaklık sensörlerinizi otomatik bulur.
          </p>
        </div>
      )}

      {sensors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((s) => (
            <div
              key={s.entityId}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-xs"
            >
              <div className="text-xs font-medium text-slate-500">
                {s.friendlyName || s.entityId}
              </div>
              <div className="text-xl font-bold font-mono text-teal-700 dark:text-teal-400">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            Home Assistant Bağlantı Ayarları (Sunucu Tarafı)
          </h2>
          {syncedAt && (
            <span className="text-xs text-slate-500">
              Son Senkronizasyon: {syncedAt}
            </span>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-slate-300 text-teal-600"
          />
          <span>Home Assistant Read-Only Integration aktivieren (Aktif Et)</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Home Assistant Basis-URL *
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://ha.akata.nl"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium">
                Long-Lived Access Token (AES-256-GCM)
              </label>
              {hasToken && (
                <span className="text-[10px] font-semibold text-emerald-600">
                  ✓ Sunucuda kayıtlı token var
                </span>
              )}
            </div>
            <input
              type="text"
              name="ha_long_lived_jwt_token"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={
                hasToken
                  ? "Kayıtlı token mevcut (değiştirmek için yeni eyJ... token yapıştırın)"
                  : "Home Assistant Long-Lived Token (eyJ...) giriniz…"
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium">
              Sensor Entity-IDs (Virgülle ayrılmış — boş bırakırsanız çalışan aktif sensörler otomatik bulunur)
            </label>
            <button
              type="button"
              onClick={() => setEntityListText("")}
              className="text-[11px] font-semibold text-teal-600 hover:underline cursor-pointer"
            >
              Listeyi Temizle (Tüm Aktif Sensörleri Otomatik Bul)
            </button>
          </div>
          <input
            type="text"
            autoComplete="off"
            value={entityListText}
            onChange={(e) => setEntityListText(e.target.value)}
            placeholder="Boş bırakıp Kaydet'e basarsanız çalışan tüm sensörler otomatik bulunur…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
        >
          {saving ? "Kaydediliyor…" : "Konfiguration speichern (Kaydet & Bağlan)"}
        </button>
      </form>
    </div>
  );
}
