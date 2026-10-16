"use client";

import React, { useEffect, useState } from "react";
import { Wallet, Plus, AlertCircle } from "lucide-react";

interface TransactionItem {
  id: string;
  description: string;
  amountFormattedDe: string;
  transactionDateFormattedDe: string;
  type: "INCOME" | "EXPENSE";
  status: string;
  category?: { nameDe: string; nameTr: string };
}

export default function FinancesPage() {
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
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [status, setStatus] = useState("RECORDED");
  const [categorySlug, setCategorySlug] = useState("groceries");
  const [transactionDate, setTransactionDate] = useState("2026-10-16");

  async function loadFinances() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/transactions");
      if (res.status === 401) {
        setError("Bitte melden Sie sich an (/login), um Ihre Haushaltsfinanzen zu verwalten.");
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
    const res = await fetch("/api/v1/agent/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        amountEur,
        type,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-teal-600" />
            Finanzen (Gelir & Gider Yönetimi)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Exakte Cent-Arithmetik (EUR) ohne Gleitkommafehler · Unterscheidung zwischen geplanten, erfassten und bestätigten Zahlungen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Buchung erfassen
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500">Einnahmen gesamt</div>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {totals.totalIncomeFormattedDe}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500">Ausgaben gesamt</div>
          <div className="text-xl font-bold font-mono text-rose-600 mt-1">
            {totals.totalExpenseFormattedDe}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500">Saldo</div>
          <div className="text-xl font-bold font-mono mt-1">
            {totals.netBalanceFormattedDe}
          </div>
        </div>
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
          <h2 className="text-sm font-semibold">Neue Transaktion erfassen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Beschreibung *</label>
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z. B. Gehalt Oktober / REWE Einkauf"
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
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {type === "INCOME" ? (
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
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-2">
          <p className="text-sm font-medium">Noch keine Transaktionen vorhanden</p>
          <p className="text-xs text-slate-500">
            Erfassen Sie Ihre Einnahmen (Gehalt, Kindergeld) und Ausgaben (Miete, Strom, Einkäufe).
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
              {transactions.map((t) => (
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
