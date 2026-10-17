"use client";

import React, { useEffect, useState } from "react";
import { FileSignature, Plus, Calendar, AlertCircle } from "lucide-react";

interface ContractItem {
  id: string;
  provider: string;
  title: string;
  category: string;
  contractNumber: string | null;
  amountFormattedDe: string;
  billingFrequency: string;
  status: string;
  startDateFormattedDe: string;
  cancellationDeadlineFormattedDe: string;
  renewalDateFormattedDe: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [provider, setProvider] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ELECTRICITY");
  const [amountEur, setAmountEur] = useState("");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [minimumTermMonths, setMinimumTermMonths] = useState("12");
  const [noticePeriodDays, setNoticePeriodDays] = useState("30");

  async function loadContracts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/contracts");
      if (res.status === 401) {
        setError("Bitte melden Sie sich an (/login), um Ihre Verträge zu verwalten.");
        setContracts([]);
      } else if (!res.ok) {
        setError("Verträge konnten nicht geladen werden.");
      } else {
        const data = await res.json();
        setContracts(data.contracts ?? []);
      }
    } catch {
      setError("Netzwerkfehler beim Laden der Verträge.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContracts();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/v1/agent/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        title,
        category,
        amountEur,
        startDate,
        minimumTermMonths: parseInt(minimumTermMonths || "12", 10),
        noticePeriodDays: parseInt(noticePeriodDays || "30", 10),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Vertrag konnte nicht gespeichert werden.");
      return;
    }

    setProvider("");
    setTitle("");
    setAmountEur("");
    setShowForm(false);
    await loadContracts();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-teal-600" />
            Verträge (Sözleşmeler)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Strom, Gas, Internet, Mobilfunk, Versicherungen, Miete & Abonnements mit automatischer Kündigungsfrist-Berechnung.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/v1/agent/contracts/export?format=csv"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            CSV Export
          </a>
          <a
            href="/api/v1/agent/contracts/export?format=json"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            JSON Export
          </a>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Neuer Vertrag
          </button>
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
          <h2 className="text-sm font-semibold">Neuen Vertrag erfassen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Anbieter (z. B. Vattenfall, Telekom) *
              </label>
              <input
                required
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Vertragsbezeichnung *
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="ELECTRICITY">Strom (Elektrik)</option>
                <option value="GAS">Gas & Heizung</option>
                <option value="WATER">Wasser</option>
                <option value="INTERNET">Internet & Festnetz</option>
                <option value="MOBILE">Mobilfunk</option>
                <option value="INSURANCE">Versicherung</option>
                <option value="RENT">Mietvertrag</option>
                <option value="VEHICLE_INSURANCE">Kfz-Versicherung</option>
                <option value="VEHICLE_FINANCING">Kfz-Finanzierung</option>
                <option value="SUBSCRIPTION">Abonnement</option>
                <option value="OTHER">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Betrag in EUR (z. B. 49,90) *
              </label>
              <input
                required
                placeholder="49,90"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Vertragsbeginn *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Laufzeit (Monate)
                </label>
                <input
                  type="number"
                  value={minimumTermMonths}
                  onChange={(e) => setMinimumTermMonths(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Frist (Tage)
                </label>
                <input
                  type="number"
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
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
              Vertrag speichern
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Verträge werden geladen…
        </div>
      ) : contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-2">
          <p className="text-sm font-medium">Noch keine Verträge hinterlegt</p>
          <p className="text-xs text-slate-500">
            Legen Sie Ihren ersten Vertrag über „Neuer Vertrag“ oder über den Hermes Agent (`/api/v1/agent/contracts`) an.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Anbieter & Titel</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Betrag</th>
                <th className="px-4 py-3">Kündigungsfrist</th>
                <th className="px-4 py-3">Verlängerung</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{c.provider}</div>
                    <div className="text-xs text-slate-500">{c.title}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{c.category}</td>
                  <td className="px-4 py-3 font-mono font-medium">
                    {c.amountFormattedDe}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {c.cancellationDeadlineFormattedDe}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{c.renewalDateFormattedDe}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                      {c.status}
                    </span>
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
