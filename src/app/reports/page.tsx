import React from "react";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-teal-600" />
          Berichte (Finansal Raporlar)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monats- und Jahresvergleiche, Kategorienauswertung und CSV-Exporte aus Ihren echten Supabase-Datensätzen.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
        Sobald Einnahmen und Ausgaben erfasst sind, werden hier Monatsvergleiche und Kategorie-Breakdown-Diagramme ohne Beispieldaten gerendert.
      </div>
    </div>
  );
}
