"use client";

import React, { useEffect, useState } from "react";
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
  KeyRound,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";

interface SummaryData {
  finances: {
    incomeFormattedDe: string;
    actualExpenseFormattedDe: string;
    remainingBudgetFormattedDe: string;
    recurringMonthlyCommitmentsFormattedDe: string;
  };
  expiringContracts: Array<{
    id: string;
    provider: string;
    title: string;
    amountFormattedDe: string;
    cancellationDeadlineFormattedDe: string;
  }>;
  upcomingBills: Array<{
    id: string;
    provider: string;
    description: string;
    amountFormattedDe: string;
    dueDateFormattedDe: string;
    effectiveStatus: string;
  }>;
  recentDocuments: Array<{
    id: string;
    title: string;
    category: string;
    uploadedAtFormattedDe: string;
  }>;
  upcomingReminders: Array<{
    id: string;
    title: string;
    priority: string;
    dueAtFormattedDe: string;
  }>;
}

export default function DashboardPage() {
  const t = getDictionary("de");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/v1/agent/summary")
      .then(async (res) => {
        if (res.status === 401) {
          setUnauthenticated(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      })
      .catch(() => {});
  }, []);

  const fin = summary?.finances ?? {
    incomeFormattedDe: "0,00 €",
    actualExpenseFormattedDe: "0,00 €",
    remainingBudgetFormattedDe: "0,00 €",
    recurringMonthlyCommitmentsFormattedDe: "0,00 €",
  };

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
          {unauthenticated && (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Anmelden / Owner Setup
            </Link>
          )}
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

      {/* Real Database KPI Summary (Backed by Integer EUR Cents — Never Fake Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/income"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-teal-500 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{t.dashboard.monthlyIncome}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold font-mono tracking-tight">
            {fin.incomeFormattedDe}
          </p>
          <p className="mt-1 text-xs text-slate-500">Erfasste & bestätigte Einnahmen</p>
        </Link>

        <Link
          href="/expenses"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-teal-500 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{t.dashboard.monthlyExpenses}</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-bold font-mono tracking-tight">
            {fin.actualExpenseFormattedDe}
          </p>
          <p className="mt-1 text-xs text-slate-500">Erfasste & bestätigte Ausgaben</p>
        </Link>

        <Link
          href="/finances"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-teal-500 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{t.dashboard.remainingBudget}</span>
            <Wallet className="w-4 h-4 text-teal-600" />
          </div>
          <p className="mt-3 text-2xl font-bold font-mono tracking-tight">
            {fin.remainingBudgetFormattedDe}
          </p>
          <p className="mt-1 text-xs text-slate-500">Exakte Cent-Berechnung</p>
        </Link>

        <Link
          href="/contracts"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-teal-500 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{t.dashboard.recurringCommitments}</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-bold font-mono tracking-tight">
            {fin.recurringMonthlyCommitmentsFormattedDe}
          </p>
          <p className="mt-1 text-xs text-slate-500">Monatliche Vertragsfixkosten</p>
        </Link>
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
          {!summary || summary.expiringContracts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              Keine anstehenden Kündigungsfristen vorhanden.
            </p>
          ) : (
            <div className="space-y-2">
              {summary.expiringContracts.map((c) => (
                <Link
                  key={c.id}
                  href="/contracts"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs"
                >
                  <div>
                    <div className="font-semibold">{c.provider}</div>
                    <div className="text-slate-500">{c.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold">{c.amountFormattedDe}</div>
                    <div className="text-amber-600">
                      Frist: {c.cancellationDeadlineFormattedDe}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
          {!summary || summary.upcomingReminders.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              Keine offenen Erinnerungen für diesen Zeitraum.
            </p>
          ) : (
            <div className="space-y-2">
              {summary.upcomingReminders.map((r) => (
                <Link
                  key={r.id}
                  href="/reminders"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs"
                >
                  <div className="font-semibold">{r.title}</div>
                  <div className="font-mono text-slate-500">
                    {r.dueAtFormattedDe}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
