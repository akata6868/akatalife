"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Wallet,
  Plus,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface TransactionItem {
  id: string;
  description: string;
  amountFormattedDe: string;
  transactionDateFormattedDe: string;
  type: "INCOME" | "EXPENSE";
  status: string;
  category?: { nameDe: string; nameTr: string };
}

export function FinancesView({
  lockedMode,
}: {
  lockedMode?: "INCOME" | "EXPENSE";
}) {
  const pathname = usePathname();
  const routeMode: "ALL" | "INCOME" | "EXPENSE" =
    lockedMode ??
    (pathname === "/income"
      ? "INCOME"
      : pathname === "/expenses"
        ? "EXPENSE"
        : "ALL");

  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "INCOME" | "EXPENSE"
  >(routeMode);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totals, setTotals] = useState({
    totalIncomeFormattedDe: "0,00 €",
    totalExpenseFormattedDe: "0,00 €",
    netBalanceFormattedDe: "0,00 €",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [description, setDescription] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    routeMode === "INCOME" ? "INCOME" : "EXPENSE"
  );
  const [status, setStatus] = useState("RECORDED");
  const [categorySlug, setCategorySlug] = useState(
    routeMode === "INCOME" ? "salary" : "groceries"
  );
  const [transactionDate, setTransactionDate] = useState("2026-10-16");

  useEffect(() => {
    setActiveFilter(routeMode);
    if (routeMode === "INCOME") {
      setType("INCOME");
      setCategorySlug("salary");
    } else if (routeMode === "EXPENSE") {
      setType("EXPENSE");
      setCategorySlug("groceries");
    }
  }, [routeMode]);

  async function loadFinances() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/transactions");
      if (res.status === 401) {
        setError(
          "Bitte melden Sie sich an (/login), um Ihre Haushaltsfinanzen zu verwalten."
        );
      } else if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions ?? []);
        if (data.totals) setTotals(data.totals);
      }
    } catch {
      setError("Fehler beim Laden der Buchungen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinances();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const submitType =
      routeMode === "INCOME"
        ? "INCOME"
        : routeMode === "EXPENSE"
          ? "EXPENSE"
          : type;
    const res = await fetch("/api/v1/agent/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        amountEur,
        type: submitType,
        status,
        categorySlug,
        transactionDate,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Buchung konnte nicht gespeichert werden.");
      return;
    }

    setDescription("");
    setAmountEur("");
    setShowForm(false);
    await loadFinances();
  }

  const visibleTransactions = transactions.filter((t) => {
    if (activeFilter === "INCOME") return t.type === "INCOME";
    if (activeFilter === "EXPENSE") return t.type === "EXPENSE";
    return true;
  });

  const incomeCount = transactions.filter((t) => t.type === "INCOME").length;
  const expenseCount = transactions.filter((t) => t.type === "EXPENSE").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {routeMode === "INCOME" ? (
              <>
                <TrendingUp className="w-6 h-6 text-emerald-600" />
                Einnahmen (Sadece Gelirler)
              </>
            ) : routeMode === "EXPENSE" ? (
              <>
                <TrendingDown className="w-6 h-6 text-rose-600" />
                Ausgaben (Sadece Giderler)
              </>
            ) : (
              <>
                <Wallet className="w-6 h-6 text-teal-600" />
                Finanzen (Gelir & Gider Yönetimi)
              </>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {routeMode === "INCOME"
              ? "Nur Einnahmen (Gelirler): Gehalt, Kindergeld, staatliche Leistungen und sonstige Zuflüsse."
              : routeMode === "EXPENSE"
                ? "Nur Ausgaben (Giderler): Miete, Energie, Einkäufe, Abonnements und Verträge."
                : "Klicken Sie unten auf Einnahmen (Gelirler) oder Ausgaben (Giderler), um die Liste sofort zu filtern."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/v1/agent/transactions/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            CSV Export
          </a>
          <button
            type="button"
            onClick={() => {
              if (activeFilter === "INCOME") {
                setType("INCOME");
                setCategorySlug("salary");
              } else if (activeFilter === "EXPENSE") {
                setType("EXPENSE");
                setCategorySlug("groceries");
              }
              setShowForm(!showForm);
            }}
            className={`inline-flex items-center gap-2 rounded-lg text-white px-4 py-2 text-xs font-semibold ${
              activeFilter === "INCOME"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : activeFilter === "EXPENSE"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-teal-700 hover:bg-teal-800"
            }`}
          >
            <Plus className="w-4 h-4" />
            {activeFilter === "INCOME"
              ? "Gelir Ekle (Einnahme)"
              : activeFilter === "EXPENSE"
                ? "Gider Ekle (Ausgabe)"
                : "Buchung erfassen"}
          </button>
        </div>
      </div>

      {/* Summary & Interactive Filter Cards */}
      {routeMode === "INCOME" ? (
        <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Einnahmen gesamt (Toplam Gelir)
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
              +{totals.totalIncomeFormattedDe}
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
            {incomeCount} Gelir Kaydı
          </span>
        </div>
      ) : routeMode === "EXPENSE" ? (
        <div className="rounded-xl border-2 border-rose-500/40 bg-rose-50/40 dark:bg-rose-950/20 p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Ausgaben gesamt (Toplam Gider)
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
              -{totals.totalExpenseFormattedDe}
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200">
            {expenseCount} Gider Kaydı
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() =>
              setActiveFilter(activeFilter === "INCOME" ? "ALL" : "INCOME")
            }
            className={`text-left rounded-xl border p-4 transition-all cursor-pointer ${
              activeFilter === "INCOME"
                ? "border-2 border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-sm"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Einnahmen (Sadece Gelirler)
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {activeFilter === "INCOME" ? "✓ Filtre Aktif" : `${incomeCount} Kayıt`}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
              +{totals.totalIncomeFormattedDe}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveFilter(activeFilter === "EXPENSE" ? "ALL" : "EXPENSE")
            }
            className={`text-left rounded-xl border p-4 transition-all cursor-pointer ${
              activeFilter === "EXPENSE"
                ? "border-2 border-rose-600 bg-rose-50/60 dark:bg-rose-950/30 shadow-sm"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Ausgaben (Sadece Giderler)
              </span>
              <span className="text-[11px] font-semibold text-rose-600">
                {activeFilter === "EXPENSE" ? "✓ Filtre Aktif" : `${expenseCount} Kayıt`}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-rose-600 mt-1">
              -{totals.totalExpenseFormattedDe}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`text-left rounded-xl border p-4 transition-all cursor-pointer ${
              activeFilter === "ALL"
                ? "border-2 border-teal-600 bg-teal-50/40 dark:bg-teal-950/20 shadow-sm"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Saldo (Tümü)
              </span>
              <span className="text-[11px] font-semibold text-teal-600">
                {activeFilter === "ALL" ? "Tümü Gösteriliyor" : "Tümünü Göster"}
              </span>
            </div>
            <div className="text-xl font-bold font-mono mt-1">
              {totals.netBalanceFormattedDe}
            </div>
          </button>
        </div>
      )}

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
            {routeMode === "INCOME"
              ? "Neue Einnahme erfassen (Yeni Gelir Ekle)"
              : routeMode === "EXPENSE"
                ? "Neue Ausgabe erfassen (Yeni Gider Ekle)"
                : "Neue Transaktion erfassen"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Beschreibung *</label>
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === "INCOME"
                    ? "z. B. Gehalt Oktober / Kindergeld"
                    : "z. B. Miete / REWE Einkauf"
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Betrag in EUR (Komma erlaubt) *
              </label>
              <input
                required
                placeholder="125,40"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            {routeMode === "ALL" && (
              <div>
                <label className="block text-xs font-medium mb-1">Typ</label>
                <select
                  value={type}
                  onChange={(e) => {
                    const next = e.target.value as "INCOME" | "EXPENSE";
                    setType(next);
                    setCategorySlug(next === "INCOME" ? "salary" : "groceries");
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="EXPENSE">Ausgabe (Gider)</option>
                  <option value="INCOME">Einnahme (Gelir)</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {(routeMode === "INCOME" ||
                  (routeMode === "ALL" && type === "INCOME")) ? (
                  <>
                    <option value="salary">Gehalt & Lohn</option>
                    <option value="kindergeld">Kindergeld</option>
                    <option value="government-benefits">Staatliche Leistungen</option>
                    <option value="other-household-income">Sonstiges Haushaltseinkommen</option>
                    <option value="other-income">Sonstige Einnahmen</option>
                  </>
                ) : (
                  <>
                    <option value="rent">Miete & Nebenkosten</option>
                    <option value="gas-heating">Gas & Heizung</option>
                    <option value="water">Wasser</option>
                    <option value="electricity">Strom</option>
                    <option value="internet">Internet</option>
                    <option value="mobile-phone">Mobilfunk</option>
                    <option value="insurance">Versicherung</option>
                    <option value="transport">Mobilität & Auto</option>
                    <option value="groceries">Lebensmittel & Drogerie</option>
                    <option value="household-purchases">Haushalt & Anschaffungen</option>
                    <option value="subscriptions">Abonnements</option>
                    <option value="financing">Kredite & Finanzierungen</option>
                    <option value="other-expenses">Sonstige Ausgaben</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Zahlungsstatus</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="RECORDED">Erfasst (Recorded)</option>
                <option value="CONFIRMED">Bestätigt (Confirmed)</option>
                <option value="PLANNED">Geplant (Planned)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Datum *</label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
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

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Buchungen werden geladen…
        </div>
      ) : visibleTransactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-2">
          <p className="text-sm font-medium">
            {activeFilter === "INCOME"
              ? "Henüz gelir kaydı bulunmuyor (Keine Einnahmen vorhanden)"
              : activeFilter === "EXPENSE"
                ? "Henüz gider kaydı bulunmuyor (Keine Ausgaben vorhanden)"
                : "Noch keine Transaktionen vorhanden"}
          </p>
          <p className="text-xs text-slate-500">
            {activeFilter === "INCOME"
              ? "Maaş, Kindergeld veya diğer gelirlerinizi yukarıdaki butondan ekleyebilirsiniz."
              : activeFilter === "EXPENSE"
                ? "Kira, elektrik, market ve abonelik giderlerinizi yukarıdaki butondan ekleyebilirsiniz."
                : "Erfassen Sie Ihre Einnahmen (Gehalt, Kindergeld) und Ausgaben (Miete, Strom, Einkäufe)."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Beschreibung</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-xs">{t.transactionDateFormattedDe}</td>
                  <td className="px-4 py-3 font-medium">{t.description}</td>
                  <td className="px-4 py-3 text-xs">
                    {t.category?.nameDe ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{t.status}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-semibold ${
                      t.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "-"}
                    {t.amountFormattedDe}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function FinancesPage() {
  return <FinancesView />;
}
