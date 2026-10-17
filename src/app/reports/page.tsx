"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  FileSignature,
  Bot,
  Trash2,
  AlertCircle,
  CheckCircle,
  Hourglass,
  FileText,
} from "lucide-react";

interface ReportItem {
  id: string;
  title: string;
  reportType: string;
  periodLabel: string | null;
  summary: string;
  highlights: string[];
  metrics: Record<string, unknown>;
  incomeCents: number;
  incomeFormattedDe: string;
  expenseCents: number;
  expenseFormattedDe: string;
  savingsCents: number;
  savingsFormattedDe: string;
  createdBy: string;
  createdAtFormattedDe: string;
}

interface LiveAnalytics {
  activeContractsCount: number;
  terminatedContractsCount: number;
  monthlyFixedFormattedDe: string;
  yearlyFixedFormattedDe: string;
  totalContractsPaidFormattedDe: string;
  totalContractsRemainingFormattedDe: string;
  totalIncomeFormattedDe: string;
  totalExpenseFormattedDe: string;
  netBalanceFormattedDe: string;
  unpaidInvoicesFormattedDe: string;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    monthlyFormattedDe: string;
    yearlyFormattedDe: string;
    sharePercent: number;
  }>;
}

const REPORT_TYPES: Array<{
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}> = [
  {
    value: "MONTHLY",
    label: "Monatsbericht (Aylık Rapor)",
    Icon: Calendar,
    iconClass:
      "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",
  },
  {
    value: "ANNUAL",
    label: "Jahresbericht (Yıllık Rapor)",
    Icon: BarChart3,
    iconClass:
      "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  },
  {
    value: "SAVINGS_ANALYSIS",
    label: "Spar- & Birikim-Analyse (Tasarruf Raporu)",
    Icon: PiggyBank,
    iconClass:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  {
    value: "CONTRACT_REVIEW",
    label: "Vertragsprüfung (Sözleşme Raporu)",
    Icon: FileSignature,
    iconClass:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  {
    value: "CUSTOM",
    label: "Sonderbericht (Özel Rapor)",
    Icon: FileText,
    iconClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [analytics, setAnalytics] = useState<LiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openTypePickerId, setOpenTypePickerId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("MONTHLY");
  const [periodLabel, setPeriodLabel] = useState("2026-10");
  const [summary, setSummary] = useState("");
  const [highlightsText, setHighlightsText] = useState("");
  const [incomeEur, setIncomeEur] = useState("");
  const [expenseEur, setExpenseEur] = useState("");
  const [savingsEur, setSavingsEur] = useState("");

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/reports");
      if (res.status === 401) {
        setError("Bitte melden Sie sich an (/login).");
      } else if (!res.ok) {
        setError("Berichte konnten nicht geladen werden.");
      } else {
        const data = await res.json();
        setReports(data.reports ?? []);
        setAnalytics(data.liveAnalytics ?? null);
      }
    } catch {
      setError("Netzwerkfehler beim Laden der Berichte.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const highlights = highlightsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/v1/agent/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        reportType,
        periodLabel: periodLabel.trim() || undefined,
        summary,
        highlights,
        incomeEur: incomeEur.trim() || undefined,
        expenseEur: expenseEur.trim() || undefined,
        savingsEur: savingsEur.trim() || undefined,
      }),
    });

    if (!res.ok) {
      setError("Bericht konnte nicht gespeichert werden.");
      return;
    }

    setTitle("");
    setSummary("");
    setHighlightsText("");
    setIncomeEur("");
    setExpenseEur("");
    setSavingsEur("");
    setShowForm(false);
    await loadReports();
  }

  async function handleTypeChange(reportId: string, newType: string) {
    setOpenTypePickerId(null);
    await fetch(`/api/v1/agent/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType: newType }),
    });
    await loadReports();
  }

  async function handleDelete(reportId: string, reportTitle: string) {
    if (!window.confirm(`Bericht "${reportTitle}" wirklich löschen?`)) return;
    const res = await fetch(`/api/v1/agent/reports/${reportId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadReports();
    }
  }

  return (
    <div
      className="space-y-6"
      onClick={() => {
        if (openTypePickerId) setOpenTypePickerId(null);
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            Berichte (Finansal & Sözleşme Raporları)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Echtzeit-Auswertungen & Hermes Agent Berichte über{" "}
            <code className="font-mono">/api/v1/agent/reports</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/v1/agent/transactions/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Transaktionen CSV
          </a>
          <a
            href="/api/v1/agent/contracts/export?format=csv"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Verträge CSV
          </a>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Neuer Bericht
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Analytics KPIs */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Vertrags-Fixkosten (Monat / Jahr)</span>
              <FileSignature className="w-4 h-4 text-teal-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono">
              {analytics.monthlyFixedFormattedDe}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              {analytics.yearlyFixedFormattedDe} / Jahr ({analytics.activeContractsCount} aktiv)
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Verträge Bisher Gezahlt (Ödenen)</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {analytics.totalContractsPaidFormattedDe}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Kumulierte Vertragszahlungen
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Verträge Verbleibend (Kalan)</span>
              <Hourglass className="w-4 h-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {analytics.totalContractsRemainingFormattedDe}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Offene Restlaufzeit-Beträge
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Einnahmen vs. Ausgaben (Netto)</span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono">
              {analytics.netBalanceFormattedDe}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              +{analytics.totalIncomeFormattedDe} / -{analytics.totalExpenseFormattedDe}
            </p>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {analytics && analytics.categoryBreakdown.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-sm font-semibold">
            Vertrags-Kategorienauswertung (Kategori Bazlı Aylık & Yıllık Dağılım)
          </h2>
          <div className="space-y-2.5">
            {analytics.categoryBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {item.category} ({item.count})
                  </span>
                  <span className="font-mono">
                    <strong>{item.monthlyFormattedDe}</strong> / Mon. ·{" "}
                    <span className="text-slate-400">
                      {item.yearlyFormattedDe} / Jahr ({item.sharePercent}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${item.sharePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold">Neuen Bericht erstellen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Titel (Başlık) *
              </label>
              <input
                required
                placeholder="z. B. Finanz- & Vertragsbericht Oktober 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Berichtstyp
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {REPORT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Zeitraum (Dönem)
              </label>
              <input
                placeholder="z. B. 2026-10 oder Q4 2026"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Einnahmen in EUR (opsiyonel)
              </label>
              <input
                placeholder="z. B. 3500,00"
                value={incomeEur}
                onChange={(e) => setIncomeEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Ausgaben in EUR (opsiyonel)
              </label>
              <input
                placeholder="z. B. 2100,00"
                value={expenseEur}
                onChange={(e) => setExpenseEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Zusammenfassung / Berichtstext *
              </label>
              <textarea
                required
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Kernpunkte (Her satıra 1 madde)
              </label>
              <textarea
                rows={3}
                value={highlightsText}
                onChange={(e) => setHighlightsText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold"
            >
              Bericht speichern
            </button>
          </div>
        </form>
      )}

      {/* Hermes Agent Reports List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Bot className="w-4 h-4 text-teal-600" />
          Hermes Agent & Gespeicherte Berichte ({reports.length})
        </h2>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Berichte werden geladen…
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
            Hermes Agent kann jetzt direkt über{" "}
            <code className="font-mono">POST https://life.akata.nl/api/v1/agent/reports</code>{" "}
            Monats-, Jahres-, Vertrags- und Sparberichte eintragen.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reports.map((r) => {
              const typeMeta =
                REPORT_TYPES.find((t) => t.value === r.reportType) ??
                REPORT_TYPES[REPORT_TYPES.length - 1]!;
              const TypeIcon = typeMeta.Icon;
              const isPickerOpen = openTypePickerId === r.id;

              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          title={`${typeMeta.label} — Klicken zum Ändern`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenTypePickerId(isPickerOpen ? null : r.id);
                          }}
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-transform hover:scale-105 ${typeMeta.iconClass}`}
                        >
                          <TypeIcon className="w-5 h-5" />
                        </button>

                        {isPickerOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-12 z-30 flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
                          >
                            {REPORT_TYPES.map((opt) => {
                              const OptionIcon = opt.Icon;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  title={opt.label}
                                  onClick={() =>
                                    handleTypeChange(r.id, opt.value)
                                  }
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-transform hover:scale-110 ${opt.iconClass}`}
                                >
                                  <OptionIcon className="w-4 h-4" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold">{r.title}</h3>
                          {r.periodLabel && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono">
                              {r.periodLabel}
                            </span>
                          )}
                          {r.createdBy === "HERMES_AGENT" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              <Bot className="w-3 h-3" />
                              Hermes Agent
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {r.createdAtFormattedDe}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
                          {r.summary}
                        </p>

                        {r.highlights && r.highlights.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            {r.highlights.map((h, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-teal-600 font-bold">•</span>
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {(r.incomeCents > 0 ||
                        r.expenseCents > 0 ||
                        r.savingsCents !== 0) && (
                        <div className="text-right text-xs font-mono space-y-0.5">
                          {r.incomeCents > 0 && (
                            <div className="text-emerald-600 flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {r.incomeFormattedDe}
                            </div>
                          )}
                          {r.expenseCents > 0 && (
                            <div className="text-rose-600 flex items-center justify-end gap-1">
                              <TrendingDown className="w-3 h-3" />
                              {r.expenseFormattedDe}
                            </div>
                          )}
                          {r.savingsCents !== 0 && (
                            <div className="font-bold text-teal-600">
                              Saldo: {r.savingsFormattedDe}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id, r.title)}
                        title="Bericht löschen"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
