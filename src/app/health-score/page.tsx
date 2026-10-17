"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  PlusCircle,
  Check,
  Award,
  Wallet,
  FileSignature,
  Flame,
  PiggyBank,
  Info,
  PieChart,
} from "lucide-react";

interface ScoreFactor {
  id: string;
  type: "POSITIVE" | "NEGATIVE";
  category: string;
  title: string;
  description: string;
  impactPoints: number;
  impactPercent: number;
  metricBadge: string;
  actionLabel?: string;
  actionUrl?: string;
}

interface ScoreRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  potentialScoreGainPoints: number;
  potentialScoreGainPercent: number;
  estimatedMonthlySavingsCents: number;
  estimatedMonthlySavingsFormattedDe: string;
  estimatedYearlySavingsFormattedDe: string;
  actionUrl: string;
  actionSteps: string[];
}

interface SubScoreItem {
  key: string;
  labelTr: string;
  labelDe: string;
  weightPercent: number;
  score: number;
  status: "EXCELLENT" | "GOOD" | "WARNING";
}

interface HealthScoreResponse {
  generatedAtFormattedDe: string;
  score: {
    schufaPercent: number;
    schufaPoints: number;
    maxPoints: number;
    composite100: number;
    ratingClass: string;
    ratingLabelDe: string;
    ratingLabelTr: string;
    riskLevel: "VERY_LOW" | "LOW" | "MODERATE" | "ELEVATED" | "HIGH";
  };
  subScores: SubScoreItem[];
  metrics: {
    monthlyIncomeCents: number;
    monthlyIncomeFormattedDe: string;
    monthlyTxExpenseCents: number;
    monthlyTxExpenseFormattedDe: string;
    monthlyContractLoadCents: number;
    monthlyContractLoadFormattedDe: string;
    discretionaryExpenseCents?: number;
    discretionaryExpenseFormattedDe?: string;
    monthlyEnergyCents: number;
    monthlyEnergyFormattedDe: string;
    totalMonthlyOutflowCents: number;
    totalMonthlyOutflowFormattedDe: string;
    netMonthlyCashflowCents: number;
    netMonthlyCashflowFormattedDe: string;
    savingsRatePercent: number;
    fixedCostRatioPercent: number;
    variableCostRatioPercent?: number;
    totalExpenseToIncomePercent?: number;
    activeContractsCount: number;
    energyConnected: boolean;
    topExpenseCategories?: Array<{
      category: string;
      amountCents: number;
      amountFormattedDe: string;
    }>;
  };
  positiveFactors: ScoreFactor[];
  negativeFactors: ScoreFactor[];
  recommendations: ScoreRecommendation[];
}

export default function HealthScorePage() {
  const [data, setData] = useState<HealthScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedRecIds, setAddedRecIds] = useState<Record<string, boolean>>({});
  const [addingRecId, setAddingRecId] = useState<string | null>(null);

  // Interactive Monthly Income & Expense Simulator State
  const [simExpenseCutEur, setSimExpenseCutEur] = useState(0);
  const [simIncomeBoostEur, setSimIncomeBoostEur] = useState(0);
  const [simContractDiscount15, setSimContractDiscount15] = useState(false);
  const [simOptimizeEnergy, setSimOptimizeEnergy] = useState(false);

  async function loadScore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/health-score", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Finansal sağlık skoru yüklenemedi.");
        return;
      }
      setData(json);
    } catch {
      setError("Finansal sağlık verileri alınırken bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScore();
  }, []);

  async function handleAddRecommendationToAdvisor(rec: ScoreRecommendation) {
    setAddingRecId(rec.id);
    try {
      const res = await fetch("/api/v1/agent/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rec.title,
          category:
            rec.category === "CONTRACT_OPTIMIZATION" ||
            rec.category === "DEBT_PAYOFF" ||
            rec.category === "WEALTH" ||
            rec.category === "BUDGET"
              ? rec.category
              : "SAVINGS",
          priority: rec.priority,
          status: "OPEN",
          summary: rec.description,
          actionSteps: rec.actionSteps,
          monthlySavingsCents: rec.estimatedMonthlySavingsCents,
        }),
      });
      if (res.ok) {
        setAddedRecIds((prev) => ({ ...prev, [rec.id]: true }));
      }
    } catch {
      // ignore
    } finally {
      setAddingRecId(null);
    }
  }

  // Simulated Monthly Budget & Score calculation
  const simulated = useMemo(() => {
    if (!data) return null;

    const contractSaveEur = simContractDiscount15
      ? Math.round((data.metrics.monthlyContractLoadCents / 100) * 0.15)
      : 0;
    const energySaveEur = simOptimizeEnergy
      ? Math.max(15, Math.round((data.metrics.monthlyEnergyCents / 100) * 0.14))
      : 0;

    const totalMonthlyGainEur =
      simExpenseCutEur + simIncomeBoostEur + contractSaveEur + energySaveEur;

    let bonusPoints = 0;
    let bonusPercent = 0;

    if (simExpenseCutEur > 0) {
      const pts = Math.round(Math.min(45, simExpenseCutEur * 0.12));
      bonusPoints += pts;
      bonusPercent += pts * 0.04;
    }

    if (simIncomeBoostEur > 0) {
      const pts = Math.round(Math.min(45, simIncomeBoostEur * 0.045));
      bonusPoints += pts;
      bonusPercent += pts * 0.038;
    }

    if (simContractDiscount15) {
      bonusPoints += 18;
      bonusPercent += 0.75;
    }

    if (simOptimizeEnergy) {
      bonusPoints += 14;
      bonusPercent += 0.55;
    }

    const newPoints = Math.min(
      data.score.maxPoints,
      data.score.schufaPoints + bonusPoints
    );
    const newPercent =
      Math.round(
        Math.min(99.9, data.score.schufaPercent + bonusPercent) * 100
      ) / 100;

    let newClass = data.score.ratingClass;
    if (newPercent >= 96.0) newClass = "A+";
    else if (newPercent >= 92.5) newClass = "A";
    else if (newPercent >= 87.5) newClass = "B";
    else if (newPercent >= 80.0) newClass = "C";
    else newClass = "D";

    const currentNetEur = data.metrics.netMonthlyCashflowCents / 100;
    const newMonthlyNetEur = currentNetEur + totalMonthlyGainEur;
    const yearlyExtraSavingsEur = totalMonthlyGainEur * 12;

    return {
      bonusPoints,
      bonusPercent: Math.round(bonusPercent * 100) / 100,
      newPoints,
      newPercent,
      newClass,
      totalMonthlyGainEur,
      newMonthlyNetEur,
      yearlyExtraSavingsEur,
      contractSaveEur,
      energySaveEur,
    };
  }, [
    data,
    simExpenseCutEur,
    simIncomeBoostEur,
    simContractDiscount15,
    simOptimizeEnergy,
  ]);

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        <div className="text-sm font-semibold">
          Aylık Gelir-Gider & Finansal Sağlık Skorunuz Hesaplanıyor…
        </div>
        <p className="text-xs text-slate-500">
          Aylık gelirleriniz, sabit sözleşmeleriniz, değişken giderleriniz ve tasarruf potansiyeliniz analiz ediliyor.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-6 text-xs text-rose-800 dark:text-rose-200">
        {error || "Skor verisi bulunamadı."}
      </div>
    );
  }

  const gaugeProgress = Math.max(
    0,
    Math.min(100, (data.score.schufaPoints / data.score.maxPoints) * 100)
  );
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (gaugeProgress / 100) * circumference;

  const barMarkerLeft = Math.max(
    4,
    Math.min(96, ((data.score.schufaPercent - 75) / 25) * 100)
  );

  // 50/30/20 Breakdown Bar percentages
  const fixedPct = Math.max(
    0,
    Math.min(100, data.metrics.fixedCostRatioPercent || 0)
  );
  const varPct = Math.max(
    0,
    Math.min(100 - fixedPct, data.metrics.variableCostRatioPercent || 0)
  );
  const savePct = Math.max(0, 100 - fixedPct - varPct);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[11px] font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Aylık Gelir-Gider Dengesi & SCHUFA-Tarzı Finansal Sağlık Analizi
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Award className="w-6 h-6 text-teal-600" />
            Aylık Finansal Sağlık & Skor Merkezi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Aylık gelir ve gider dengeniz, sabit sözleşme yükünüz, tasarruf oranınız (50/30/20 kuralı) ve bütçenizi iyileştirecek kişisel tavsiyeler.
          </p>
        </div>

        <button
          type="button"
          onClick={loadScore}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`}
          />
          Skoru Yeniden Hesapla
        </button>
      </div>

      {/* HERO ROW: Left = SCHUFA Score Gauge Card, Right = 5 Monthly Income/Expense Sub-Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SCHUFA Score Main Gauge Card */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-teal-300 font-bold">
                AYLIK GELİR-GİDER SKORU
              </span>
              <h2 className="text-lg font-bold mt-0.5">
                Finansal Sağlık Endeksi
              </h2>
            </div>
            <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-extrabold text-lg">
              Sınıf {data.score.ratingClass}
            </div>
          </div>

          {/* Circular Gauge + Big Score */}
          <div className="my-6 flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="14"
                  fill="transparent"
                />
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="url(#scoreGrad)"
                  strokeWidth="14"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black tracking-tight text-white">
                  %{data.score.schufaPercent.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs font-semibold text-teal-300 mt-0.5">
                  {data.score.schufaPoints} / {data.score.maxPoints} Puan
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {data.score.ratingLabelTr}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bu skor doğrudan <strong>aylık geliriniz</strong>, <strong>sabit sözleşme ve değişken giderleriniz</strong> ile <strong>aylık tasarruf oranınız</strong> üzerinden hesaplanır.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-left">
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                  <div className="text-[10px] text-slate-400">
                    Aylık Net Kalan
                  </div>
                  <div
                    className={`text-xs font-bold mt-0.5 ${
                      data.metrics.netMonthlyCashflowCents >= 0
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }`}
                  >
                    {data.metrics.netMonthlyCashflowFormattedDe}
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                  <div className="text-[10px] text-slate-400">
                    Tasarruf Oranı
                  </div>
                  <div className="text-xs font-bold text-teal-300 mt-0.5">
                    %{data.metrics.savingsRatePercent.toFixed(1)} (Hedef %20)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SCHUFA Color Scale Bar */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <div className="flex justify-between text-[10px] text-slate-300 font-medium">
              <span>Bütçe Açığı (&lt;%80)</span>
              <span>Dengeli (%88)</span>
              <span>Çok İyi (%92,5)</span>
              <span>Mükemmel (&gt;%96)</span>
            </div>
            <div className="relative h-3 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 via-60% to-emerald-400">
              <div
                className="absolute -top-1.5 w-6 h-6 rounded-full bg-white border-4 border-teal-600 shadow-lg -translate-x-1/2 transition-all duration-500"
                style={{ left: `${barMarkerLeft}%` }}
                title={`Skorunuz: %${data.score.schufaPercent}`}
              />
            </div>
          </div>
        </div>

        {/* Right: 5 Monthly Financial Health Criteria + Monthly Income/Expense Bar */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold">
                Aylık Finansal Sağlık Kriterleri (Gelir & Gider Odaklı)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aylık bütçe sağlığınızı belirleyen 5 temel gelir/gider göstergesi
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300">
              Bütçe Endeksi: {data.score.composite100}/100
            </span>
          </div>

          <div className="space-y-3.5">
            {data.subScores.map((sub) => (
              <div key={sub.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {sub.labelTr}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                      Ağırlık: %{sub.weightPercent}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-extrabold ${
                      sub.score >= 85
                        ? "text-emerald-600 dark:text-emerald-400"
                        : sub.score >= 70
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {sub.score} / 100 Puan
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sub.score >= 85
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500"
                        : sub.score >= 70
                          ? "bg-gradient-to-r from-sky-500 to-teal-500"
                          : "bg-gradient-to-r from-amber-500 to-orange-500"
                    }`}
                    style={{ width: `${sub.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 50 / 30 / 20 Monthly Income vs Expense Visual Breakdown */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-teal-600" />
                Aylık Gelir-Gider Dağılımı (50/30/20 Bütçe Röntgeni)
              </span>
              <span className="text-[11px] text-slate-500">
                Toplam Gider: <strong>{data.metrics.totalMonthlyOutflowFormattedDe}</strong> / Gelir: <strong>{data.metrics.monthlyIncomeFormattedDe}</strong>
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div
                className="bg-indigo-500 h-full transition-all"
                style={{ width: `${fixedPct}%` }}
                title={`Sabit Sözleşmeler: %${fixedPct.toFixed(1)}`}
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${varPct}%` }}
                title={`Değişken Harcamalar: %${varPct.toFixed(1)}`}
              />
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${savePct}%` }}
                title={`Net Kalan / Tasarruf: %${savePct.toFixed(1)}`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <Link
                href="/income"
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-500/50 transition"
              >
                <div className="text-slate-400 flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-emerald-600" /> Aylık Gelir
                </div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {data.metrics.monthlyIncomeFormattedDe}
                </div>
              </Link>

              <Link
                href="/contracts"
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-500/50 transition"
              >
                <div className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Sabit Sözleşme (%{fixedPct.toFixed(0)})
                </div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {data.metrics.monthlyContractLoadFormattedDe}
                </div>
              </Link>

              <Link
                href="/expenses"
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 hover:border-amber-500/50 transition"
              >
                <div className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Değişken Gider (%{varPct.toFixed(0)})
                </div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {data.metrics.discretionaryExpenseFormattedDe ||
                    data.metrics.monthlyTxExpenseFormattedDe}
                </div>
              </Link>

              <Link
                href="/energy"
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 hover:border-orange-500/50 transition"
              >
                <div className="text-slate-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" /> Isınma & Enerji
                </div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {data.metrics.monthlyEnergyFormattedDe}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* POSITIVE vs NEGATIVE FACTORS (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Positive Factors */}
        <div className="rounded-3xl border border-emerald-200/80 dark:border-emerald-900/50 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                  Aylık Finansal Sağlığı Pozitif Etkileyen Alanlar
                </h2>
                <p className="text-xs text-slate-500">
                  Gelir-gider dengenizi ve skorunuzu güçlendiren noktalar ({data.positiveFactors.length})
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {data.positiveFactors.map((f) => (
              <div
                key={f.id}
                className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {f.title}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                    +{f.impactPoints} Puan (+%{f.impactPercent.toFixed(1)})
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {f.description}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                    {f.metricBadge}
                  </span>
                  {f.actionUrl && (
                    <Link
                      href={f.actionUrl}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline"
                    >
                      {f.actionLabel || "İncele"}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Negative / Improvement Areas */}
        <div className="rounded-3xl border border-rose-200/80 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rose-950 dark:text-rose-200">
                  Aylık Bütçeyi Negatif Etkileyen & İyileştirilebilir Alanlar
                </h2>
                <p className="text-xs text-slate-500">
                  Gider yükü oluşturan veya tasarruf fırsatı barındıran noktalar ({data.negativeFactors.length})
                </p>
              </div>
            </div>
          </div>

          {data.negativeFactors.length > 0 ? (
            <div className="space-y-3">
              {data.negativeFactors.map((f) => (
                <div
                  key={f.id}
                  className="rounded-2xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {f.title}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 shrink-0">
                      {f.impactPoints} Puan ({f.impactPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {f.description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800">
                      {f.metricBadge}
                    </span>
                    {f.actionUrl && (
                      <Link
                        href={f.actionUrl}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        {f.actionLabel || "İyileştir"}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold">
                Harika! Aylık Gelir-Gider Dengenizde Negatif Etken Görünmüyor
              </div>
              <p className="text-xs text-slate-500">
                Sabit sözleşmeleriniz, değişken harcamalarınız ve tasarruf oranınız ideal sınırlar içinde.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* INTERACTIVE MONTHLY BUDGET & SCORE SIMULATOR */}
      {simulated && (
        <div className="rounded-3xl border border-teal-200 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40 dark:from-teal-950/25 dark:via-slate-900 dark:to-slate-900 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  Aylık Gelir-Gider & Skor Simülatörü (Canlı Senaryo Testi)
                </h2>
                <p className="text-xs text-slate-500">
                  Aylık giderlerinizi azalttığınızda veya gelirinizi artırdığınızda skorunuzun ve yıllık birikiminizin nasıl değişeceğini test edin.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-teal-200 dark:border-teal-800 shadow-xs">
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                  Simüle Edilen Yeni Skor
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-teal-600 dark:text-teal-400">
                    %{simulated.newPercent.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    ({simulated.newPoints} Puan • Sınıf {simulated.newClass})
                  </span>
                </div>
              </div>
              {simulated.totalMonthlyGainEur > 0 && (
                <div className="pl-3 border-l border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    Ek Yıllık Kazanç
                  </div>
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    +{simulated.yearlyExtraSavingsEur.toLocaleString("de-DE")} € / Yıl
                  </div>
                </div>
              )}
              {simulated.bonusPoints > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white text-xs font-extrabold">
                  +{simulated.bonusPoints} Puan
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span>Aylık Değişken Harcama Tasarrufu (Market, Alışveriş vb.)</span>
                  <span className="text-teal-600 font-bold">
                    -{simExpenseCutEur} € / Ay (+{simExpenseCutEur * 12} € / Yıl)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  value={simExpenseCutEur}
                  onChange={(e) => setSimExpenseCutEur(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>0 €</span>
                  <span>150 €</span>
                  <span>300 €</span>
                  <span>500 €</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span>Aylık Gelir Artışı (Maaş / Ek Gelir)</span>
                  <span className="text-teal-600 font-bold">
                    +{simIncomeBoostEur} € / Ay
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1500}
                  step={50}
                  value={simIncomeBoostEur}
                  onChange={(e) => setSimIncomeBoostEur(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>0 €</span>
                  <span>500 €</span>
                  <span>1.000 €</span>
                  <span>1.500 €</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex flex-col justify-center">
              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-teal-500/50 transition">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={simContractDiscount15}
                    onChange={(e) => setSimContractDiscount15(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600"
                  />
                  <div>
                    <div className="text-xs font-bold">
                      Sabit Sözleşmelerde %15 Tarife İndirimi / Değişimi
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Elektrik, internet ve sigorta sözleşmelerinde tarife optimizasyonu
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 shrink-0">
                  +18 Puan
                </span>
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-teal-500/50 transition">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={simOptimizeEnergy}
                    onChange={(e) => setSimOptimizeEnergy(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600"
                  />
                  <div>
                    <div className="text-xs font-bold">
                      Ev Isınma & Sıcak Su Giderinde %14 Tasarruf (Home Assistant)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Gece sıcaklık düşürme ve sıcak su saat optimizasyonu
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 shrink-0">
                  +14 Puan
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ACTIONABLE MONTHLY FINANCIAL IMPROVEMENT RECOMMENDATIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              Aylık Finansal Sağlığı İyileştirme & Tasarruf Tavsiyeleri
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gelir-gider dengenizi güçlendirecek, sabit yükünüzü azaltacak ve aylık net birikiminizi artıracak somut adımlar.
            </p>
          </div>
          <Link
            href="/advisor"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:underline"
          >
            <PiggyBank className="w-4 h-4" />
            Tasarruf Paneline Git
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recommendations.map((rec) => {
            const isAdded = Boolean(addedRecIds[rec.id]);
            return (
              <div
                key={rec.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        rec.priority === "CRITICAL"
                          ? "bg-rose-500/15 text-rose-600"
                          : rec.priority === "HIGH"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                      }`}
                    >
                      {rec.priority === "CRITICAL"
                        ? "Öncelikli Adım"
                        : rec.priority === "HIGH"
                          ? "Yüksek Bütçe Etkisi"
                          : "Önerilen İyileştirme"}
                    </span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      +{rec.potentialScoreGainPoints} Puan (+%
                      {rec.potentialScoreGainPercent})
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rec.description}
                  </p>

                  {rec.actionSteps.length > 0 && (
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-teal-600" /> Uygulanacak Adımlar
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 list-disc list-inside">
                        {rec.actionSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400">
                      Bütçeye Katkısı
                    </div>
                    <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {rec.estimatedYearlySavingsFormattedDe}{" "}
                      <span className="text-[11px] font-normal text-slate-400">
                        ({rec.estimatedMonthlySavingsFormattedDe}/Ay)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isAdded || addingRecId === rec.id}
                      onClick={() => handleAddRecommendationToAdvisor(rec)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        isAdded
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-teal-600 hover:bg-teal-700 text-white"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Plana Eklendi
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          Tasarruf Planıma Ekle
                        </>
                      )}
                    </button>

                    <Link
                      href={rec.actionUrl}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Sayfaya Git
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
