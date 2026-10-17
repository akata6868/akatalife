"use client";

import React, { useEffect, useState } from "react";
import { Home, Wrench, Gauge, Plus, AlertCircle } from "lucide-react";

interface PropertyItem {
  id: string;
  name: string;
  address: string | null;
  propertyType: string;
  assets: Array<{
    id: string;
    name: string;
    category: string;
    brand: string | null;
  }>;
  meterReadings: Array<{
    id: string;
    meterType: string;
    readingValue: number;
    unit: string;
    readingDate: string;
  }>;
}

export default function HomeInventoryPage() {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [propName, setPropName] = useState("Hauptwohnung");
  const [propAddress, setPropAddress] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetBrand, setAssetBrand] = useState("");
  const [meterType, setMeterType] = useState("ELECTRICITY");
  const [meterValue, setMeterValue] = useState("");

  async function loadHome() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/home");
      if (res.status === 401) {
        setError("Bitte melden Sie sich an (/login), um Ihre Hausdaten zu verwalten.");
      } else if (res.ok) {
        const data = await res.json();
        setProperties(data.properties ?? []);
      }
    } catch {
      setError("Fehler beim Laden der Hausdaten.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHome();
  }, []);

  async function handleCreateProperty(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/agent/home", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordType: "PROPERTY",
        name: propName,
        address: propAddress,
      }),
    });
    if (res.ok) {
      setPropAddress("");
      await loadHome();
    }
  }

  async function handleCreateAsset(e: React.FormEvent, propertyId: string) {
    e.preventDefault();
    if (!assetName) return;
    const res = await fetch("/api/v1/agent/home", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordType: "ASSET",
        propertyId,
        name: assetName,
        brand: assetBrand,
        category: "APPLIANCE",
      }),
    });
    if (res.ok) {
      setAssetName("");
      setAssetBrand("");
      await loadHome();
    }
  }

  async function handleCreateMeter(e: React.FormEvent, propertyId: string) {
    e.preventDefault();
    if (!meterValue) return;
    const res = await fetch("/api/v1/agent/home", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordType: "METER_READING",
        propertyId,
        meterType,
        readingValue: parseFloat(meterValue.replace(",", ".")),
        unit: meterType === "WATER" || meterType === "GAS" ? "m3" : "kWh",
      }),
    });
    if (res.ok) {
      setMeterValue("");
      await loadHome();
    }
  }

  const primaryProp = properties[0];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="w-6 h-6 text-teal-600" />
          Mein Zuhause (Evim & Envanter)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Wohnungsdaten, Räume, Haushaltsgeräte, Garantien, Wartungshistorie & Zählerstände (`/api/v1/agent/home`).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !primaryProp && !error && (
        <form
          onSubmit={handleCreateProperty}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold">Wohnung / Immobilie anlegen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              required
              value={propName}
              onChange={(e) => setPropName(e.target.value)}
              placeholder="Bezeichnung (z. B. Hauptwohnung)"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            <input
              value={propAddress}
              onChange={(e) => setPropAddress(e.target.value)}
              placeholder="Adresse (optional)"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 text-white px-4 py-2 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Immobilie speichern
          </button>
        </form>
      )}

      {primaryProp && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-teal-600" />
              Haushaltsgeräte & Inventar ({primaryProp.assets.length})
            </h2>
            <form
              onSubmit={(e) => handleCreateAsset(e, primaryProp.id)}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                required
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Gerät (z. B. Waschmaschine)"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
              />
              <input
                value={assetBrand}
                onChange={(e) => setAssetBrand(e.target.value)}
                placeholder="Marke (z. B. Bosch)"
                className="sm:w-36 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-teal-700 text-white px-3 py-1.5 text-xs font-semibold"
              >
                Hinzufügen
              </button>
            </form>
            <div className="space-y-2">
              {primaryProp.assets.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs"
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="text-slate-500">{a.brand ?? a.category}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Gauge className="w-4 h-4 text-teal-600" />
              Zählerstände ({primaryProp.meterReadings.length})
            </h2>
            <form
              onSubmit={(e) => handleCreateMeter(e, primaryProp.id)}
              className="flex flex-col sm:flex-row gap-2"
            >
              <select
                value={meterType}
                onChange={(e) => setMeterType(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
              >
                <option value="ELECTRICITY">Strom (kWh)</option>
                <option value="GAS">Gas (m³)</option>
                <option value="WATER">Wasser (m³)</option>
              </select>
              <input
                required
                value={meterValue}
                onChange={(e) => setMeterValue(e.target.value)}
                placeholder="Zählerstand (z. B. 14250,5)"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs font-mono"
              />
              <button
                type="submit"
                className="rounded-lg bg-teal-700 text-white px-3 py-1.5 text-xs font-semibold"
              >
                Erfassen
              </button>
            </form>
            <div className="space-y-2">
              {primaryProp.meterReadings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs"
                >
                  <span className="font-medium">{m.meterType}</span>
                  <span className="font-mono font-semibold">
                    {m.readingValue} {m.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
