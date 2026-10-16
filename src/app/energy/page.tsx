import React from "react";
import { Cpu, ShieldAlert } from "lucide-react";

export default function EnergyPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="w-6 h-6 text-teal-600" />
          Geräte & Energie (Home Assistant — Milestone 6)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Optionale, schreibgeschützte Integration mit Ihrer Home Assistant Instanz.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <ShieldAlert className="w-4 h-4" />
          Standardmäßig deaktiviert (HOME_ASSISTANT_ENABLED=false)
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Gemäß den Sicherheitsrichtlinien werden keine Sensorwerte oder Entitäten erfunden. Sobald Sie Ihre Home-Assistant-URL und ein Long-Lived Access Token in den Umgebungsvariablen hinterlegen (Milestone 6), werden hier Raumtemperatur, Heizstatus sowie Strom- und Gasverbrauch schreibgeschützt angezeigt.
        </p>
      </div>
    </div>
  );
}
