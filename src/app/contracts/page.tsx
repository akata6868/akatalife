"use client";

import React, { useEffect, useState } from "react";
import { FileSignature, Plus, Calendar, AlertCircle, Trash2 } from "lucide-react";

interface ContractItem {
  id: string;
  provider: string;
  title: string;
  category: string;
  contractNumber: string | null;
  amountFormattedDe: string;
  billingFrequency: string;
  status: string;
  isTerminatedOrEnded?: boolean;
  startDateFormattedDe: string;
  cancellationDeadlineFormattedDe: string;
  renewalDateFormattedDe: string;
}

const STATUS_LABELS: Record<
  string,
  { label: string; badgeClass: string; isStruckThrough: boolean }
> = {
  ACTIVE: {
    label: "Aktiv (Aktif)",
    badgeClass:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    isStruckThrough: false,
  },
  CANCELLATION_PLANNED: {
    label: "Kündigung eingereicht (Çıkış Verildi)",
    badgeClass:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    isStruckThrough: true,
  },
  CANCELLED: {
    label: "Gekündigt (Çıkış Verildi)",
    badgeClass:
      "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
    isStruckThrough: true,
  },
  EXPIRED: {
    label: "Beendet / Abgelaufen (Bitmiş)",
    badgeClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700",
    isStruckThrough: true,
  },
  ARCHIVED: {
    label: "Archiviert (Bitmiş)",
    badgeClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700",
    isStruckThrough: true,
  },
};

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
  const [status, setStatus] = useState("ACTIVE");

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
        status,
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
    setStatus("ACTIVE");
    setShowForm(false);
    await loadContracts();
  }

  async function handleStatusChange(contractId: string, newStatus: string) {
    setError(null);
    const res = await fetch(`/api/v1/agent/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      setError("Status konnte nicht aktualisiert werden.");
      return;
    }
    await loadContracts();
  }

  async function handleDelete(contractId: string, contractTitle: string) {
    if (!window.confirm(`Vertrag "${contractTitle}" wirklich löschen?`)) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/v1/agent/contracts/${contractId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Vertrag konnte nicht gelöscht werden.");
      return;
    }
    await loadContracts();
  }

  const sortedContracts = [...contracts].sort((a, b) => {
    const aStruck =
      Boolean(a.isTerminatedOrEnded) ||
      (STATUS_LABELS[a.status]?.isStruckThrough ?? false);
    const bStruck =
      Boolean(b.isTerminatedOrEnded) ||
      (STATUS_LABELS[b.status]?.isStruckThrough ?? false);
    if (aStruck !== bStruck) return aStruck ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-teal-600" />
            Verträge (Sözleşmeler)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Strom, Gas, Internet, Mobilfunk, Versicherungen, Miete & Abonnements — gekündigte und beendete Verträge werden durchgestrichen dargestellt.
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
            <div>
              <label className="block text-xs font-medium mb-1">
                Status (Durum)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Aktiv (Aktif)</option>
                <option value="CANCELLATION_PLANNED">
                  Kündigung eingereicht (Çıkış Verildi)
                </option>
                <option value="CANCELLED">Gekündigt (Çıkış Verildi / İptal)</option>
                <option value="EXPIRED">Beendet / Abgelaufen (Bitmiş)</option>
              </select>
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
      ) : sortedContracts.length === 0 ? (
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
                <th className="px-4 py-3">Verlängerung / Ende</th>
                <th className="px-4 py-3">Status (Durum)</th>
                <th className="px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {sortedContracts.map((c) => {
                const statusMeta = STATUS_LABELS[c.status] ?? {
                  label: c.status,
                  badgeClass:
                    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                  isStruckThrough: false,
                };
                const isStruck =
                  Boolean(c.isTerminatedOrEnded) || statusMeta.isStruckThrough;
                const textStrikeClass = isStruck
                  ? "line-through decoration-rose-500/80 dark:decoration-rose-400/80 decoration-2 text-slate-400 dark:text-slate-500"
                  : "";

                return (
                  <tr
                    key={c.id}
                    className={
                      isStruck
                        ? "bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 transition-colors"
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    }
                  >
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${textStrikeClass}`}>
                        {c.provider}
                      </div>
                      <div
                        className={`text-xs ${
                          isStruck
                            ? "line-through decoration-slate-400 text-slate-400 dark:text-slate-500"
                            : "text-slate-500"
                        }`}
                      >
                        {c.title}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs ${textStrikeClass}`}>
                      {c.category}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono font-medium ${textStrikeClass}`}
                    >
                      {c.amountFormattedDe}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isStruck
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {c.cancellationDeadlineFormattedDe}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${textStrikeClass}`}>
                      {c.renewalDateFormattedDe}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        <select
                          aria-label="Status ändern"
                          value={c.status}
                          onChange={(e) =>
                            handleStatusChange(c.id, e.target.value)
                          }
                          className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300"
                        >
                          <option value="ACTIVE">Aktiv (Aktif)</option>
                          <option value="CANCELLATION_PLANNED">
                            Çıkış Verildi (Kündigung eingereicht)
                          </option>
                          <option value="CANCELLED">
                            İptal / Çıkış Verildi (Gekündigt)
                          </option>
                          <option value="EXPIRED">
                            Bitmiş (Beendet / Abgelaufen)
                          </option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.title)}
                        title="Vertrag löschen"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
