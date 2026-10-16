import React from "react";
import { ShieldCheck, Database, Server, Bot } from "lucide-react";

export default function SystemStatusPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-teal-600" />
          Backup & Systemstatus (Yedekleme & Sistem Durumu)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Coolify Container-Status, Supabase PostgreSQL Verbindung, privater Dokumentenspeicher und Audit-Trail.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Deployment
            </span>
            <Server className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-base font-bold">Coolify + GitHub</div>
          <p className="text-xs text-slate-500">
            Standalone Next.js Container mit Healthcheck auf <code>/api/health</code>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Datenbank
            </span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold">Supabase PostgreSQL</div>
          <p className="text-xs text-slate-500">
            Prisma ORM mit <code>DATABASE_URL</code> & <code>DIRECT_URL</code> Migrationen.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Agent Gateway
            </span>
            <Bot className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-base font-bold">Hermes Agent API v1</div>
          <p className="text-xs text-slate-500">
            Vollzugriff über Bearer-API-Key mit lückenlosem Audit-Log.
          </p>
        </div>
      </div>
    </div>
  );
}
