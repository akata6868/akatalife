"use client";

import React, { useEffect, useState } from "react";
import { Receipt, Plus, AlertCircle } from "lucide-react";

interface InvoiceItem {
  id: string;
  provider: string;
  description: string;
  invoiceNumber: string | null;
  amountFormattedDe: string;
  dueDateFormattedDe: string;
  effectiveStatus: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [provider, setProvider] = useState("");
  const [description, setDescription] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("2026-10-16");
  const [dueDate, setDueDate] = useState("2026-10-30");

  async function loadInvoices() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/invoices");
      if (res.status === 401) {
        setError("Bitte melden Sie sich an (/login), um Rechnungen zu verwalten.");
      } else if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices ?? []);
      }
    } catch {
      setError("Fehler beim Laden der Rechnungen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/v1/agent/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        description,
        amountEur,
        invoiceDate,
        dueDate,
        status: "UNPAID",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Rechnung konnte nicht gespeichert werden.");
      return;
    }

    setProvider("");
    setDescription("");
    setAmountEur("");
    setShowForm(false);
    await loadInvoices();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-teal-600" />
            Rechnungen (Faturalar & Ödemeler)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automatische Überfälligkeitsprüfung (Overdue) anhand des Fälligkeitsdatums.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Rechnung erfassen
        </button>
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
          <h2 className="text-sm font-semibold">Neue Rechnung anlegen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Anbieter *</label>
              <input
                required
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Beschreibung *</label>
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Betrag (EUR) *</label>
              <input
                required
                placeholder="89,00"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fällig am *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
          Rechnungen werden geladen…
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-2">
          <p className="text-sm font-medium">Keine offenen oder geplanten Rechnungen</p>
          <p className="text-xs text-slate-500">
            Erfassen Sie Rechnungen manuell oder über den Hermes Agent (`/api/v1/agent/invoices`).
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Anbieter & Beschreibung</th>
                <th className="px-4 py-3">Fällig am</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{inv.provider}</div>
                    <div className="text-xs text-slate-500">{inv.description}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{inv.dueDateFormattedDe}</td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {inv.effectiveStatus}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {inv.amountFormattedDe}
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
