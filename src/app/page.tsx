import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileSignature,
  FolderLock,
  Receipt,
  Bell,
  Bot,
  Database,
  ArrowRight,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatEurCents } from "@/lib/finance/money";

export default function DashboardPage() {
  const t = getDictionary("de");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/contracts"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2 text-xs font-medium transition-colors"
          >
            <FileSignature className="w-3.5 h-3.5" />
            {t.dashboard.addContract}
          </Link>
          <Link
            href="/finances"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-2 text-xs font-medium transition-colors"
          >
            <Wallet className="w-3.5 h-3.5" />
            {t.dashboard.addTransaction}
          </Link>
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-medium transition-colors"
          >
            <FolderLock className="w-3.5 h-3.5" />
            {t.dashboard.uploadDocument}
          </Link>
        </div>
      </div>

      {/* Real Zero-State KPI Summary (Backed by Integer EUR Cents — Never Fake Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{t.dashboard.monthlyIncome}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold font-mono tracking-tight">
            {formatEurCents(0, "de")}
          </p>
          <p className="mt-1 text-xs text-slate-500">0 bestätigte Buchungen</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{t.dashboard.monthlyExpenses}</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-bold font-mono tracking-tight">
            {formatEurCents(0, "de")}
          </p>
          <p className="mt-1 text-xs text-slate-500">0 erfasste Ausgaben</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{t.dashboard.remainingBudget}</span>
            <Wallet className="w-4 h-4 text-teal-600" />
          </div>
          <p className="mt-3 text-2xl font-bold font-mono tracking-tight">
            {formatEurCents(0, "de")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Exakte Cent-Berechnung</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{t.dashboard.recurringCommitments}</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-bold font-mono tracking-tight">
            {formatEurCents(0, "de")}
          </p>
          <p className="mt-1 text-xs text-slate-500">0 aktive Verträge</p>
        </div>
      </div>

      {/* Onboarding & Infrastructure Status Card */}
      <div className="rounded-xl border border-teal-200 dark:border-teal-900/70 bg-teal-50/50 dark:bg-teal-950/30 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              <Database className="w-4 h-4" />
              Supabase PostgreSQL · Coolify · Hermes Agent API
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t.dashboard.emptyTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              {t.dashboard.emptyDescription}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <a
              href="/api/v1/agent/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 px-4 py-2.5 text-xs font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-50"
            >
              <Bot className="w-4 h-4" />
              Hermes Agent OpenAPI Spec
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Secondary Grid: Expiring Contracts, Upcoming Bills, Recent Documents, Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-teal-600" />
              {t.dashboard.expiringContracts}
            </h3>
            <Link
              href="/contracts"
              className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
            >
              Alle anzeigen →
            </Link>
          </div>
          <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            Keine anstehenden Kündigungsfristen vorhanden.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              {t.dashboard.upcomingReminders}
            </h3>
            <Link
              href="/reminders"
              className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
            >
              Alle anzeigen →
            </Link>
          </div>
          <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            Keine offenen Erinnerungen für diesen Zeitraum.
          </p>
        </section>
      </div>
    </div>
  );
}
