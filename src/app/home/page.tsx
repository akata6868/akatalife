"use client";

import React from "react";
import { Home, Wrench, Gauge } from "lucide-react";

export default function HomeInventoryPage() {
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <Home className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-sm">Immobilie & Räume</h2>
          <p className="text-xs text-slate-500">
            Miet- oder Eigentumsdaten, Wohnfläche, Vermieterkontakt und Raumaufteilung.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <Wrench className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-sm">Geräte, Garantien & Wartung</h2>
          <p className="text-xs text-slate-500">
            Kaufdatum, Garantieablauf, Seriennummern, verknüpfte Kassenbons & Bedienungsanleitungen.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <Gauge className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-sm">Zählerstände (Strom, Gas, Wasser)</h2>
          <p className="text-xs text-slate-500">
            Unabhängig von Home Assistant nutzbares Zählerstandsprotokoll in kWh und m³.
          </p>
        </div>
      </div>
    </div>
  );
}
