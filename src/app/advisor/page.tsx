"use client";

import React, { useEffect, useState } from "react";
import {
  PiggyBank,
  Sparkles,
  TrendingUp,
  FileSignature,
  Wallet,
  CreditCard,
  CheckCircle2,
  Clock,
  Lightbulb,
  XCircle,
  Plus,
  Trash2,
  Bot,
  AlertCircle,
  ArrowUpRight,
  Target,
} from "lucide-react";

interface AdviceItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  summary: string;
  actionSteps: string[];
  monthlySavingsCents: number;
  monthlySavingsFormattedDe: string;
  yearlySavingsCents: number;
  yearlySavingsFormattedDe: string;
  targetAmountCents: number | null;
  targetAmountFormattedDe: string | null;
  currentAmountCents: number;
  currentAmountFormattedDe: string;
  goalProgressPercent: number;
  createdBy: string;
  createdAtFormattedDe: string;
}

interface SavingsSummary {
  potentialMonthlySavingsCents: number;
  potentialMonthlySavingsFormattedDe: string;
  potentialYearlySavingsCents: number;
  potentialYearlySavingsFormattedDe: string;
  realizedYearlySavingsCents: number;
  realizedYearlySavingsFormattedDe: string;
  totalTargetCents: number;
  totalTargetFormattedDe: string;
  totalCurrentSavedCents: number;
  totalCurrentSavedFormattedDe: string;
  overallGoalProgressPercent: number;
  monthlyContractCommitmentsFormattedDe: string;
  suggestedMonthlySavingsFormattedDe: string;
  netBalanceFormattedDe: string;
}

const CATEGORY_OPTIONS: Array<{
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}> = [
  {
    value: "SAVINGS",
    label: "Tasarruf Tavsiyesi (Sparpotenzial)",
    Icon: PiggyBank,
    iconClass:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  {
    value: "WEALTH",
    label: "Birikim & Yatırım (Vermögensaufbau / Sparziel)",
    Icon: TrendingUp,
    iconClass:
      "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",
  },
  {
    value: "CONTRACT_OPTIMIZATION",
    label: "Sözleşme & Tarif Optimizasyonu (Tarifwechsel)",
    Icon: FileSignature,
    iconClass:
      "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  },
  {
    value: "BUDGET",
    label: "Bütçe & Harcama Analizi (Budget-Optimierung)",
    Icon: Wallet,
    iconClass:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  {
    value: "DEBT_PAYOFF",
    label: "Borç / Taksit Kapatma (Tilgung)",
    Icon: CreditCard,
    iconClass:
      "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  },
  {
    value: "GENERAL",
    label: "Genel Finans Tavsiyesi (Allgemein)",
    Icon: Sparkles,
    iconClass:
      "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  },
];

const STATUS_OPTIONS: Array<{
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}> = [
  {
    value: "OPEN",
    label: "Offen / Aktif Tavsiye",
    Icon: Lightbulb,
    iconClass:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  {
    value: "IN_PROGRESS",
    label: "In Umsetzung / Uygulanıyor",
    Icon: Clock,
    iconClass:
      "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  },
  {
    value: "APPLIED",
    label: "Umgesetzt / Uygulandı (Tasarruf Edildi)",
    Icon: CheckCircle2,
    iconClass:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  {
    value: "DISMISSED",
    label: "Verworfen / Yoksayıldı",
    Icon: XCircle,
    iconClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700",
  },
];

export default function AdvisorPage() {
  const [adviceList, setAdviceList] = useState<AdviceItem[]>([]);
  const [summary, setSummary] = useState<SavingsSummary>({
    potentialMonthlySavingsCents: 0,
    potentialMonthlySavingsFormattedDe: "0,00 €",
    potentialYearlySavingsCents: 0,
    potentialYearlySavingsFormattedDe: "0,00 €",
    realizedYearlySavingsCents: 0,
    realizedYearlySavingsFormattedDe: "0,00 €",
    totalTargetCents: 0,
    totalTargetFormattedDe: "0,00 €",
    totalCurrentSavedCents: 0,
    totalCurrentSavedFormattedDe: "0,00 €",
    overallGoalProgressPercent: 0,
    monthlyContractCommitmentsFormattedDe: "0,00 €",
    suggestedMonthlySavingsFormattedDe: "0,00 €",
    netBalanceFormattedDe: "0,00 €",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);

  const [openPicker, setOpenPicker] = useState<{
    id: string;
    type: "category" | "status";
  } | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("SAVINGS");
  const [priority, setPriority] = useState("HIGH");
  const [summaryText, setSummaryText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [monthlySavingsEur, setMonthlySavingsEur] = useState("");
  const [targetAmountEur, setTargetAmountEur] = useState("");
  const [currentAmountEur, setCurrentAmountEur] = useState("");

  async function loadAdvice() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/advice");
      if (res.status === 401) {
        setError("Bitte melden Sie sich an (/login).");
        setAdviceList([]);
      } else if (!res.ok) {
        setError("Empfehlungen konnten nicht geladen werden.");
      } else {
        const data = await res.json();
        setAdviceList(data.advice ?? []);
        if (data.savingsSummary) {
          setSummary(data.savingsSummary);
        }
      }
    } catch {
      setError("Netzwerkfehler beim Laden der Empfehlungen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdvice();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const actionSteps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/v1/agent/advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        priority,
        summary: summaryText,
        actionSteps,
        monthlySavingsEur: monthlySavingsEur.trim() || undefined,
        targetAmountEur: targetAmountEur.trim() || undefined,
        currentAmountEur: currentAmountEur.trim() || undefined,
      }),
    });

    if (!res.ok) {
      setError("Eintrag konnte nicht gespeichert werden.");
      return;
    }

    setTitle("");
    setSummaryText("");
    setStepsText("");
    setMonthlySavingsEur("");
    setTargetAmountEur("");
    setCurrentAmountEur("");
    setShowForm(false);
    await loadAdvice();
  }

  async function handlePatch(id: string, patch: Record<string, unknown>) {
    setError(null);
    setOpenPicker(null);
    const res = await fetch(`/api/v1/agent/advice/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setError("Aktualisierung fehlgeschlagen.");
      return;
    }
    await loadAdvice();
  }

  async function handleDelete(id: string, itemTitle: string) {
    if (!window.confirm(`"${itemTitle}" wirklich löschen?`)) return;
    const res = await fetch(`/api/v1/agent/advice/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadAdvice();
    }
  }

  const filteredList = adviceList.filter((item) =>
    filterCategory === "ALL" ? true : item.category === filterCategory
  );

  return (
    <div
      className="space-y-6"
      onClick={() => {
        if (openPicker) setOpenPicker(null);
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-teal-600" />
            Hermes Spar- & Finanzberater (Tasarruf & Birikim)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            KI-gestützte Sparpotenziale, Vertragsoptimierungen, Vermögensaufbau & Sparziele — direkt über Hermes Agent (`/api/v1/agent/advice`) gesteuert.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold shrink-0"
        >
          <Plus className="w-4 h-4" />
           Neues Sparziel / Empfehlung
        </button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sparpotenzial (Aylık / Yıllık)</span>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-teal-700 dark:text-teal-400">
            {summary.potentialMonthlySavingsFormattedDe}
            <span className="text-xs font-normal text-slate-400"> / Mon.</span>
          </p>
          <p className="mt-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {summary.potentialYearlySavingsFormattedDe} pro Jahr möglich
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Realisierte Ersparnis (Kazanılan)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {summary.realizedYearlySavingsFormattedDe}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Bereits umgesetzte Hermes-Tipps / Jahr
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Birikim Hedefleri (Sparziele)</span>
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono">
            {summary.totalCurrentSavedFormattedDe}{" "}
            <span className="text-xs font-normal text-slate-400">
              / {summary.totalTargetFormattedDe}
            </span>
          </p>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${summary.overallGoalProgressPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>20% Birikim Kuralı & Fixkosten</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono">
            {summary.suggestedMonthlySavingsFormattedDe}
            <span className="text-xs font-normal text-slate-400"> Empf.</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Vertrags-Fixkosten: {summary.monthlyContractCommitmentsFormattedDe}
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterCategory("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            filterCategory === "ALL"
              ? "bg-teal-700 text-white border-teal-700"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          Tümü / Alle ({adviceList.length})
        </button>
        {CATEGORY_OPTIONS.map((cat) => {
          const Icon = cat.Icon;
          const active = filterCategory === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFilterCategory(cat.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label.split(" (")[0]}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold">
            Neue Spartipp-Empfehlung oder Birikim Hedefi erfassen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Titel (Başlık) *
              </label>
              <input
                required
                placeholder="z. B. Stromtarif wechseln oder Notgroschen 10.000 €"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Kategorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Monatliche Ersparnis in EUR (Aylık Tasarruf)
              </label>
              <input
                placeholder="z. B. 35,00"
                value={monthlySavingsEur}
                onChange={(e) => setMonthlySavingsEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Birikim Hedefi in EUR (Sparziel - opsiyonel)
              </label>
              <input
                placeholder="z. B. 5000,00"
                value={targetAmountEur}
                onChange={(e) => setTargetAmountEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Mevcut Birikim in EUR (Bisher gespart - opsiyonel)
              </label>
              <input
                placeholder="z. B. 1200,00"
                value={currentAmountEur}
                onChange={(e) => setCurrentAmountEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Analyse & Empfehlung (Detaylı Tavsiye Açıklaması) *
              </label>
              <textarea
                required
                rows={3}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                placeholder="Warum lohnt sich dieser Schritt und wie wirkt er sich auf das Budget aus?"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Schritte (Her satıra 1 adım - opsiyonel)
              </label>
              <textarea
                rows={3}
                value={stepsText}
                onChange={(e) => setStepsText(e.target.value)}
                placeholder={"1. Vergleich prüfen\n2. Kündigung vormerken"}
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
              Speichern
            </button>
          </div>
        </form>
      )}

      {/* Advice & Wealth Cards */}
      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Spar- & Birikim-Empfehlungen werden geladen…
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-2">
          <p className="text-sm font-medium">
            Noch keine Spar- oder Birikim-Empfehlungen in dieser Ansicht
          </p>
          <p className="text-xs text-slate-500 max-w-xl mx-auto">
            Hermes Agent kann Ihre Verträge, Einnahmen und Ausgaben analysieren und hier über{" "}
            <code className="font-mono">POST /api/v1/agent/advice</code> konkrete Spartipps, Tarifwechsel und Birikim-Ziele eintragen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredList.map((item) => {
            const catMeta =
              CATEGORY_OPTIONS.find((c) => c.value === item.category) ??
              CATEGORY_OPTIONS[0]!;
            const statusMeta =
              STATUS_OPTIONS.find((s) => s.value === item.status) ??
              STATUS_OPTIONS[0]!;

            const CatIcon = catMeta.Icon;
            const StatusIcon = statusMeta.Icon;

            const isDismissed = item.status === "DISMISSED";
            const isApplied = item.status === "APPLIED";

            const isCatOpen =
              openPicker?.id === item.id && openPicker?.type === "category";
            const isStatusOpen =
              openPicker?.id === item.id && openPicker?.type === "status";

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-5 transition-colors ${
                  isDismissed
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 opacity-65"
                    : isApplied
                      ? "border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Single Unified Category Icon with Click Popover */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        title={`${catMeta.label} — Klicken zum Ändern`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPicker(
                            isCatOpen
                              ? null
                              : { id: item.id, type: "category" }
                          );
                        }}
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-transform hover:scale-105 ${catMeta.iconClass}`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </button>

                      {isCatOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-12 z-30 flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
                        >
                          {CATEGORY_OPTIONS.map((opt) => {
                            const OptionIcon = opt.Icon;
                            const active = opt.value === item.category;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                title={opt.label}
                                onClick={() =>
                                  handlePatch(item.id, { category: opt.value })
                                }
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-transform hover:scale-110 ${
                                  opt.iconClass
                                } ${
                                  active
                                    ? "ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-900"
                                    : "opacity-80 hover:opacity-100"
                                }`}
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
                        <h3
                          className={`text-base font-bold ${
                            isDismissed ? "line-through text-slate-400" : ""
                          }`}
                        >
                          {item.title}
                        </h3>
                        {item.createdBy === "HERMES_AGENT" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <Bot className="w-3 h-3" />
                            Hermes Agent
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {item.createdAtFormattedDe}
                        </span>
                      </div>

                      <p
                        className={`text-sm leading-relaxed ${
                          isDismissed
                            ? "line-through text-slate-400"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {item.summary}
                      </p>

                      {item.actionSteps && item.actionSteps.length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          {item.actionSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="font-mono font-bold text-teal-600">
                                {idx + 1}.
                              </span>
                              <span
                                className={isDismissed ? "line-through" : ""}
                              >
                                {step}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Wealth / Savings Target Progress Bar if targetAmountCents is set */}
                      {item.targetAmountCents !== null &&
                        item.targetAmountCents > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 max-w-md">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium text-slate-500">
                                Birikim İlerlemesi (Sparziel):{" "}
                                <strong className="font-mono text-slate-800 dark:text-slate-200">
                                  {item.currentAmountFormattedDe}
                                </strong>{" "}
                                / {item.targetAmountFormattedDe}
                              </span>
                              <span className="font-mono font-semibold text-teal-600">
                                {item.goalProgressPercent}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-teal-600 transition-all"
                                style={{
                                  width: `${item.goalProgressPercent}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Right Side: Savings Figures + Single Unified Status Icon + Delete */}
                  <div className="flex items-center gap-3 self-end sm:self-start shrink-0">
                    {(item.monthlySavingsCents > 0 ||
                      item.yearlySavingsCents > 0) && (
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold font-mono ${
                            isDismissed
                              ? "line-through text-slate-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          +{item.monthlySavingsFormattedDe} / Mon.
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          +{item.yearlySavingsFormattedDe} / Jahr
                        </div>
                      </div>
                    )}

                    {/* Single Unified Status Icon with Click Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        title={`${statusMeta.label} — Klicken zum Ändern`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPicker(
                            isStatusOpen
                              ? null
                              : { id: item.id, type: "status" }
                          );
                        }}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-transform hover:scale-105 ${statusMeta.iconClass}`}
                      >
                        <StatusIcon className="w-4 h-4" />
                      </button>

                      {isStatusOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-11 z-30 flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
                        >
                          {STATUS_OPTIONS.map((opt) => {
                            const OptionIcon = opt.Icon;
                            const active = opt.value === item.status;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                title={opt.label}
                                onClick={() =>
                                  handlePatch(item.id, { status: opt.value })
                                }
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-transform hover:scale-110 ${
                                  opt.iconClass
                                } ${
                                  active
                                    ? "ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-900"
                                    : "opacity-80 hover:opacity-100"
                                }`}
                              >
                                <OptionIcon className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      title="Eintrag löschen"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
  );
}
