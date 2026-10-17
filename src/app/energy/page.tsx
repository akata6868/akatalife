"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Flame,
  Thermometer,
  Droplets,
  Battery,
  BatteryLow,
  BatteryCharging,
  Zap,
  Euro,
  Search,
  Settings2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  Check,
} from "lucide-react";

interface SensorReading {
  entityId: string;
  state: string;
  numericValue: number | null;
  unit: string | null;
  friendlyName: string | null;
  deviceClass?: string | null;
  lastUpdated?: string | null;
  isAvailable: boolean;
  isStale: boolean;
}

type SensorCategory = "ALL" | "COST_GAS" | "CLIMATE" | "BATTERY" | "OTHER";

function detectCategory(s: SensorReading): Exclude<SensorCategory, "ALL"> {
  const id = s.entityId.toLowerCase();
  const name = (s.friendlyName || "").toLowerCase();
  const unit = (s.unit || "").toLowerCase();
  const dc = (s.deviceClass || "").toLowerCase();

  if (
    dc === "battery" ||
    id.includes("batterie") ||
    id.includes("battery") ||
    name.includes("batterie")
  ) {
    return "BATTERY";
  }

  if (
    dc === "temperature" ||
    dc === "humidity" ||
    unit === "°c" ||
    unit === "°f" ||
    id.includes("temperatur") ||
    id.includes("luftfeuchtigkeit") ||
    id.includes("humidity")
  ) {
    return "CLIMATE";
  }

  if (
    dc === "monetary" ||
    dc === "gas" ||
    unit === "€" ||
    unit === "eur" ||
    unit === "m³" ||
    id.includes("kosten") ||
    id.includes("cost") ||
    id.includes("gas") ||
    id.includes("heizung") ||
    id.includes("warmwasser") ||
    id.includes("vitodens")
  ) {
    return "COST_GAS";
  }

  return "OTHER";
}

function detectPeriodBadge(s: SensorReading): string | null {
  const combined = `${s.entityId} ${s.friendlyName || ""}`.toLowerCase();
  if (combined.includes("heute") || combined.includes("today")) return "Bugün (Heute)";
  if (combined.includes("7_tage") || combined.includes("7 tage")) return "Son 7 Gün";
  if (combined.includes("monat") || combined.includes("month")) return "Bu Ay (Monat)";
  if (combined.includes("jahr") || combined.includes("year")) return "Bu Yıl (Jahr)";
  return null;
}

function formatDisplayValue(s: SensorReading): { main: string; unit: string } {
  if (!s.isAvailable) {
    return { main: "Kullanılamıyor", unit: "Nicht verfügbar" };
  }

  const rawUnit = (s.unit || "").trim();
  const displayUnit = rawUnit === "EUR" ? "€" : rawUnit;

  const num =
    s.numericValue !== null
      ? s.numericValue
      : Number.isFinite(Number(s.state))
        ? Number(s.state)
        : null;

  if (num !== null) {
    if (displayUnit === "€") {
      return {
        main: num.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        unit: "€",
      };
    }
    if (displayUnit === "%") {
      return {
        main: num.toLocaleString("de-DE", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        }),
        unit: "%",
      };
    }
    return {
      main: num.toLocaleString("de-DE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
      unit: displayUnit,
    };
  }

  return { main: s.state, unit: displayUnit };
}

function cleanDisplayName(s: SensorReading): string {
  const raw = (s.friendlyName || "").trim();
  if (
    raw &&
    raw.toLowerCase() !== "sensor cost" &&
    raw.toLowerCase() !== "cost" &&
    raw !== s.entityId
  ) {
    return raw;
  }

  return s.entityId
    .replace(/^sensor\./i, "")
    .replace(/^e3_vitodens_\d+_\d+_/i, "Vitodens ")
    .replace(/^ww_/i, "Warmwasser ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EnergyPage() {
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [entityListText, setEntityListText] = useState("");
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [catalog, setCatalog] = useState<SensorReading[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // UI filters & modals
  const [activeCategory, setActiveCategory] = useState<SensorCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");

  async function loadEnergy() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/agent/energy", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || `Sunucu hatası (HTTP ${res.status})`);
        return;
      }
      const isEnabled = Boolean(data.enabled);
      setEnabled(isEnabled);
      setHasToken(Boolean(data.hasToken));
      if (data.baseUrl) setBaseUrl(data.baseUrl);
      if (Array.isArray(data.selectedEntityIds)) {
        setEntityListText(data.selectedEntityIds.join(", "));
      }
      setSensors(data.sensors ?? []);
      setCatalog(data.catalog ?? []);
      setSyncedAt(
        data.syncedAtFormattedDe || data.lastSyncAtFormattedDe || null
      );
      if (!isEnabled || !data.configured) {
        setShowSettings(true);
      }
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

  async function persistSelectedIds(
    nextEntityIds: string[],
    toastMessage?: string
  ) {
    setEntityListText(nextEntityIds.join(", "));
    try {
      const res = await fetch("/api/v1/agent/energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          baseUrl: baseUrl || undefined,
          entityIds: nextEntityIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.saved === false) {
        setErrorMsg(data.error || "Sensör listesi güncellenemedi.");
        return false;
      }
      if (toastMessage) {
        setStatusMsg(toastMessage);
        setTimeout(() => setStatusMsg(null), 4000);
      }
      return true;
    } catch {
      setErrorMsg("Sensör listesi kaydedilirken ağ hatası oluştu.");
      return false;
    }
  }

  async function handleRemoveSensor(entityIdToRemove: string) {
    setRemovingId(entityIdToRemove);
    const remaining = sensors.filter((s) => s.entityId !== entityIdToRemove);
    setSensors(remaining);
    const nextIds = remaining.map((s) => s.entityId);
    await persistSelectedIds(
      nextIds,
      `✓ "${entityIdToRemove}" sensörü kaldırıldı.`
    );
    setRemovingId(null);
  }

  async function handleRemoveAllUnavailable() {
    const activeOnly = sensors.filter((s) => s.isAvailable && !s.isStale);
    const removedCount = sensors.length - activeOnly.length;
    if (removedCount <= 0) return;

    setSensors(activeOnly);
    const nextIds = activeOnly.map((s) => s.entityId);
    await persistSelectedIds(
      nextIds,
      `✓ ${removedCount} adet kullanılamayan / eski sensör listeden temizlendi.`
    );
  }

  async function handleToggleCatalogSensor(sensorItem: SensorReading) {
    const exists = sensors.some((s) => s.entityId === sensorItem.entityId);
    let updated: SensorReading[];
    if (exists) {
      updated = sensors.filter((s) => s.entityId !== sensorItem.entityId);
    } else {
      updated = [...sensors, sensorItem];
    }
    setSensors(updated);
    await persistSelectedIds(
      updated.map((s) => s.entityId),
      exists
        ? `✓ "${cleanDisplayName(sensorItem)}" kaldırıldı.`
        : `✓ "${cleanDisplayName(sensorItem)}" panele eklendi.`
    );
  }

  async function handleAutoDiscoverActive() {
    setSaving(true);
    setEntityListText("");
    const ok = await persistSelectedIds(
      [],
      "✓ Tüm çalışan aktif sensörler otomatik keşfedildi."
    );
    if (ok) {
      await loadEnergy();
    }
    setSaving(false);
  }

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

  // Computed KPI metrics
  const kpis = useMemo(() => {
    const findNum = (idSubstr: string) => {
      const item = sensors.find(
        (s) => s.isAvailable && s.entityId.toLowerCase().includes(idSubstr)
      );
      if (!item) return null;
      const n =
        item.numericValue !== null ? item.numericValue : Number(item.state);
      return Number.isFinite(n) ? n : null;
    };

    const heizungHeute = findNum("heizung_kosten_heute");
    const wwHeute = findNum("warmwasser_kosten_heute");
    const todayTotalCost =
      heizungHeute !== null || wwHeute !== null
        ? (heizungHeute ?? 0) + (wwHeute ?? 0)
        : null;

    const heizungMonat = findNum("heizung_kosten_monat");
    const wwMonat = findNum("warmwasser_kosten_monat");
    const monthTotalCost =
      heizungMonat !== null || wwMonat !== null
        ? (heizungMonat ?? 0) + (wwMonat ?? 0)
        : null;

    const tempSensors = sensors.filter(
      (s) =>
        s.isAvailable &&
        (s.unit === "°C" || s.entityId.toLowerCase().includes("temperatur"))
    );
    const avgTemp =
      tempSensors.length > 0
        ? tempSensors.reduce((acc, s) => acc + (Number(s.state) || 0), 0) /
          tempSensors.length
        : null;

    const humSensors = sensors.filter(
      (s) =>
        s.isAvailable &&
        s.unit === "%" &&
        (s.entityId.toLowerCase().includes("luftfeuchtigkeit") ||
          s.entityId.toLowerCase().includes("humidity"))
    );
    const avgHumidity =
      humSensors.length > 0
        ? humSensors.reduce((acc, s) => acc + (Number(s.state) || 0), 0) /
          humSensors.length
        : null;

    const unavailableCount = sensors.filter(
      (s) => !s.isAvailable || s.isStale
    ).length;
    const activeCount = sensors.length - unavailableCount;

    return {
      todayTotalCost,
      heizungHeute,
      wwHeute,
      monthTotalCost,
      avgTemp,
      avgHumidity,
      activeCount,
      unavailableCount,
    };
  }, [sensors]);

  // Filtered sensors
  const filteredSensors = useMemo(() => {
    return sensors.filter((s) => {
      if (activeCategory !== "ALL" && detectCategory(s) !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = cleanDisplayName(s).toLowerCase().includes(q);
        const matchId = s.entityId.toLowerCase().includes(q);
        return matchName || matchId;
      }
      return true;
    });
  }, [sensors, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<SensorCategory, number> = {
      ALL: sensors.length,
      COST_GAS: 0,
      CLIMATE: 0,
      BATTERY: 0,
      OTHER: 0,
    };
    for (const s of sensors) {
      counts[detectCategory(s)]++;
    }
    return counts;
  }, [sensors]);

  const filteredCatalog = useMemo(() => {
    const source = catalog.length > 0 ? catalog : sensors;
    if (!catalogSearch.trim()) return source;
    const q = catalogSearch.toLowerCase();
    return source.filter(
      (c) =>
        cleanDisplayName(c).toLowerCase().includes(q) ||
        c.entityId.toLowerCase().includes(q)
    );
  }, [catalog, sensors, catalogSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[11px] font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Canlı Akıllı Ev & Enerji Köprüsü ({baseUrl || "Home Assistant"})
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-teal-600" />
            Geräte & Energie (Akıllı Ev Paneli)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Isınma maliyetlerinizi, oda sıcaklık/nem değerlerini ve bağlı cihaz bataryalarını canlı takip edin; istemediğiniz sensörleri tek tıkla kaldırın.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kpis.unavailableCount > 0 && (
            <button
              type="button"
              onClick={handleRemoveAllUnavailable}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 px-3.5 py-2 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Kullanılamayanları Sil ({kpis.unavailableCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCatalogModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Sensör Ekle / Seç
          </button>

          <button
            type="button"
            onClick={loadEnergy}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`}
            />
            Yenile
          </button>

          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Bağlantı Ayarları"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            Ayarlar
            {showSettings ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Home Assistant Bağlantı Uyarısı</div>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {statusMsg && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{statusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      {sensors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Today's Heating & Hot Water Cost */}
          <div className="rounded-2xl border border-orange-200/80 dark:border-orange-900/50 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/50 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">
                Bugünkü Isınma & Su
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">
              {kpis.todayTotalCost !== null
                ? `${kpis.todayTotalCost.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €`
                : "—"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {kpis.heizungHeute !== null || kpis.wwHeute !== null
                ? `Kalorifer: ${(kpis.heizungHeute ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € • Sıcak Su: ${(kpis.wwHeute ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                : "Günlük tüketim özeti"}
            </div>
          </div>

          {/* KPI 2: Monthly Energy Cost */}
          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Bu Ay Toplam Maliyet
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Euro className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">
              {kpis.monthTotalCost !== null
                ? `${kpis.monthTotalCost.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €`
                : "—"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Aylık kalorifer + sıcak su toplamı
            </div>
          </div>

          {/* KPI 3: Indoor Climate */}
          <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/50 dark:from-sky-950/30 dark:via-slate-900 dark:to-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-800 dark:text-sky-300">
                Ortalama Ev İklimi
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Thermometer className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">
              {kpis.avgTemp !== null
                ? `${kpis.avgTemp.toLocaleString("de-DE", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })} °C`
                : "—"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {kpis.avgHumidity !== null
                ? `Ortalama Nem: %${kpis.avgHumidity.toFixed(0)}`
                : "Oda sıcaklık ortalaması"}
            </div>
          </div>

          {/* KPI 4: Sensor Health */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Sensör Durumu
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                {kpis.activeCount} Aktif
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">
              {kpis.activeCount}{" "}
              <span className="text-sm font-normal text-slate-400">
                / {sensors.length} sensör
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{syncedAt ? `Senk: ${syncedAt}` : "Canlı bağlantı"}</span>
              {kpis.unavailableCount > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveAllUnavailable}
                  className="text-amber-600 hover:underline font-semibold cursor-pointer"
                >
                  {kpis.unavailableCount} pasifi sil
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs & Search Bar */}
      {sensors.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "ALL", label: "Tümü", icon: Sparkles },
                { id: "COST_GAS", label: "Isınma & Maliyet", icon: Flame },
                { id: "CLIMATE", label: "Sıcaklık & Nem", icon: Thermometer },
                { id: "BATTERY", label: "Cihaz Bataryaları", icon: BatteryCharging },
                ...(categoryCounts.OTHER > 0
                  ? [{ id: "OTHER" as SensorCategory, label: "Diğer", icon: Zap }]
                  : []),
              ] as { id: SensorCategory; label: string; icon: any }[]
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {categoryCounts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sensör adı veya ID ara…"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:border-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sensor Cards Grid */}
      {filteredSensors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSensors.map((s) => {
            const category = detectCategory(s);
            const period = detectPeriodBadge(s);
            const display = formatDisplayValue(s);
            const title = cleanDisplayName(s);
            const numVal =
              s.numericValue !== null
                ? s.numericValue
                : Number.isFinite(Number(s.state))
                  ? Number(s.state)
                  : null;

            const isHumidity =
              category === "CLIMATE" &&
              (s.unit === "%" ||
                s.entityId.toLowerCase().includes("luftfeuchtigkeit"));

            const isLowBattery =
              category === "BATTERY" &&
              s.isAvailable &&
              numVal !== null &&
              numVal <= 15;

            return (
              <div
                key={s.entityId}
                className={`group relative rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                  !s.isAvailable
                    ? "border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900/40 opacity-75"
                    : isLowBattery
                      ? "border-rose-300 dark:border-rose-800/80 bg-rose-50/30 dark:bg-rose-950/20 shadow-xs hover:shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-teal-500/40"
                }`}
              >
                {/* Top row: Icon + Title + Delete Button */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          !s.isAvailable
                            ? "bg-slate-200/70 dark:bg-slate-800 text-slate-400"
                            : category === "COST_GAS"
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              : category === "CLIMATE"
                                ? isHumidity
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                  : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                : category === "BATTERY"
                                  ? isLowBattery
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {category === "COST_GAS" ? (
                          <Flame className="w-4 h-4" />
                        ) : category === "CLIMATE" ? (
                          isHumidity ? (
                            <Droplets className="w-4 h-4" />
                          ) : (
                            <Thermometer className="w-4 h-4" />
                          )
                        ) : category === "BATTERY" ? (
                          isLowBattery ? (
                            <BatteryLow className="w-4 h-4" />
                          ) : (
                            <Battery className="w-4 h-4" />
                          )
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div
                          className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                          title={title}
                        >
                          {title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {period && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {period}
                            </span>
                          )}
                          {!s.isAvailable && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              Çevrimdışı
                            </span>
                          )}
                          {isLowBattery && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-300">
                              Düşük Pil!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Per-Card Remove / Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSensor(s.entityId)}
                      disabled={removingId === s.entityId}
                      title="Bu sensörü panelden kaldır"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Value Display */}
                  <div className="mt-4 flex items-baseline gap-1.5">
                    {s.isAvailable ? (
                      <>
                        <span
                          className={`text-2xl font-extrabold tracking-tight ${
                            isLowBattery
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {display.main}
                        </span>
                        {display.unit && (
                          <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                            {display.unit}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">
                        Nicht verfügbar (Veri Yok)
                      </span>
                    )}
                  </div>

                  {/* Progress bar for Battery or Humidity */}
                  {s.isAvailable &&
                    numVal !== null &&
                    (category === "BATTERY" || isHumidity) && (
                      <div className="mt-2.5 w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            category === "BATTERY"
                              ? numVal <= 15
                                ? "bg-rose-500"
                                : numVal <= 35
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              : numVal > 65
                                ? "bg-amber-500"
                                : "bg-sky-500"
                          }`}
                          style={{
                            width: `${Math.max(4, Math.min(100, numVal))}%`,
                          }}
                        />
                      </div>
                    )}
                </div>

                {/* Footer entity_id */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-mono text-slate-400 truncate"
                    title={s.entityId}
                  >
                    {s.entityId}
                  </span>
                  {s.isStale && (
                    <span className="text-[10px] text-amber-600 font-medium shrink-0">
                      Eski Veri
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
          <Cpu className="w-8 h-8 text-teal-600 mx-auto" />
          <div className="text-sm font-semibold">
            {sensors.length === 0
              ? "Henüz seçili sensör yok"
              : "Bu filtreye uygun sensör bulunamadı"}
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Home Assistant sunucunuzdaki çalışan tüm sensörleri otomatik bulmak veya katalogdan seçmek için aşağıdaki butonları kullanabilirsiniz.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleAutoDiscoverActive}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Aktif Sensörleri Otomatik Keşfet
            </button>
            {catalog.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Katalogdan Seç ({catalog.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Server-Side Connection Settings */}
      {showSettings && (
        <form
          onSubmit={handleSaveConfig}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-teal-600" />
                Home Assistant Bağlantı Ayarları (Sunucu Tarafı)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bu ayarlar `/plugins` sayfasındaki Home Assistant kartıyla %100 senkronize çalışır.
              </p>
            </div>
            {syncedAt && (
              <span className="text-xs text-slate-500">
                Son Senkronizasyon: {syncedAt}
              </span>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
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
                placeholder="https://ha68.nl"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
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
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium">
                Seçili Sensör Entity-ID Listesi (Boş bırakırsanız çalışanlar otomatik bulunur)
              </label>
              <button
                type="button"
                onClick={handleAutoDiscoverActive}
                className="text-[11px] font-semibold text-teal-600 hover:underline cursor-pointer"
              >
                Sıfırla & Tüm Aktif Sensörleri Otomatik Bul
              </button>
            </div>
            <input
              type="text"
              autoComplete="off"
              value={entityListText}
              onChange={(e) => setEntityListText(e.target.value)}
              placeholder="Boş bırakıp Kaydet'e basarsanız çalışan tüm sensörler otomatik bulunur…"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              {saving ? "Kaydediliyor…" : "Konfiguration speichern (Kaydet & Bağlan)"}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </form>
      )}

      {/* Sensor Catalog / Picker Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[82vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-600" />
                  Home Assistant Sensör Kataloğu ({filteredCatalog.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Panelde görmek istediğiniz sensörleri işaretleyin, istemediklerinizi kaldırın.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Katalogda sensör ara (örn: vitodens, temperatur, batterie, strom)…"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-2 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleAutoDiscoverActive}
                className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 text-xs font-semibold shrink-0 cursor-pointer"
              >
                Otomatik Seç
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
              {filteredCatalog.map((item) => {
                const isSelected = sensors.some(
                  (s) => s.entityId === item.entityId
                );
                const disp = formatDisplayValue(item);
                return (
                  <div
                    key={item.entityId}
                    onClick={() => handleToggleCatalogSensor(item)}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? "bg-teal-50/70 dark:bg-teal-950/30"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {cleanDisplayName(item)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {item.entityId}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                          item.isAvailable
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.isAvailable
                          ? `${disp.main}${disp.unit ? ` ${disp.unit}` : ""}`
                          : "Nicht verfügbar"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <span className="text-xs text-slate-500">
                Toplam <strong>{sensors.length}</strong> sensör panelde seçili
              </span>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
