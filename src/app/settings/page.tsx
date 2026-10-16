import React from "react";
import Link from "next/link";
import { Settings, Bot, KeyRound, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-600" />
            Einstellungen & Hermes Agent API (Ayarlar)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Konto, Lokalisierung (DE/TR), 2FA (TOTP) und Hermes Agent Vollzugriff.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 text-white px-4 py-2 text-xs font-semibold"
        >
          <KeyRound className="w-4 h-4" />
          Anmeldung / Owner Setup
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-400">
          <Bot className="w-5 h-5" />
          Hermes Agent Vollzugriff (API-Konfiguration)
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Hermes Agent kann über den Header{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
            Authorization: Bearer &lt;HERMES_AGENT_API_KEY&gt;
          </code>{" "}
          oder{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
            X-Hermes-Api-Key: &lt;HERMES_AGENT_API_KEY&gt;
          </code>{" "}
          auf alle Module zugreifen:
        </p>
        <ul className="text-xs font-mono space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <li>GET  /api/v1/agent/openapi.json (OpenAPI 3.1 Tool-Schema)</li>
          <li>GET  /api/v1/agent/summary (Komplette Haushalts- & Finanzübersicht)</li>
          <li>GET | POST /api/v1/agent/contracts (Verträge & Kündigungsfristen)</li>
          <li>GET | POST /api/v1/agent/documents (Dokumente & PDF/Bild-Uploads)</li>
          <li>GET | POST /api/v1/agent/transactions (Einnahmen & Ausgaben in EUR-Cents)</li>
          <li>GET | POST /api/v1/agent/invoices (Rechnungen & Fälligkeiten)</li>
          <li>GET | POST /api/v1/agent/reminders (Termine & Erinnerungen)</li>
          <li>GET | POST /api/v1/agent/home (Immobilie, Räume, Geräte & Zählerstände)</li>
        </ul>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Jede Schreiboperation des Hermes Agent wird automatisch in der Tabelle{" "}
          <code className="font-mono">AuditEvent</code> mit{" "}
          <code className="font-mono">actorType = HERMES_AGENT</code> protokolliert.
        </div>
      </div>
    </div>
  );
}
