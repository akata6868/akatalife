"use client";

import React, { useEffect, useState } from "react";
import {
  FileSignature,
  Plus,
  Calendar,
  AlertCircle,
  Trash2,
  Zap,
  Flame,
  Droplets,
  Wifi,
  Smartphone,
  Shield,
  Home,
  Car,
  CreditCard,
  Tv,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Archive,
  CheckCircle,
  Hourglass,
} from "lucide-react";

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
  effectivePaidCents: number;
  paidFormattedDe: string;
  effectiveRemainingCents: number;
  remainingFormattedDe: string;
  effectiveTotalCents: number;
  totalFormattedDe: string;
  effectivePaidInstallments: number;
  effectiveRemainingInstallments: number;
  paymentProgressPercent: number;
}

interface PaymentSummary {
  totalPaidCents: number;
  totalPaidFormattedDe: string;
  totalRemainingCents: number;
  totalRemainingFormattedDe: string;
}

const CATEGORY_OPTIONS: Array<{
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}> = [
  {
    value: "ELECTRICITY",
    label: "Strom (Elektrik)",
    Icon: Zap,
    iconClass:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  {
    value: "GAS",
    label: "Gas & Heizung (Doğalgaz)",
    Icon: Flame,
    iconClass:
      "bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  },
  {
    value: "WATER",
    label: "Wasser (Su)",
    Icon: Droplets,
    iconClass:
      "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  },
  {
    value: "INTERNET",
    label: "Internet & Festnetz",
    Icon: Wifi,
    iconClass:
      "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  },
  {
    value: "MOBILE",
    label: "Mobilfunk (Cep Telefonu)",
    Icon: Smartphone,
    iconClass:
      "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  },
  {
    value: "INSURANCE",
    label: "Versicherung (Sigorta)",
    Icon: Shield,
    iconClass:
      "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",
  },
  {
    value: "RENT",
    label: "Miete & Wohnen (Kira)",
    Icon: Home,
    iconClass:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  {
    value: "VEHICLE_INSURANCE",
    label: "Kfz-Versicherung (Araç Sigortası)",
    Icon: Car,
    iconClass:
      "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  {
    value: "VEHICLE_FINANCING",
    label: "Kfz-Finanzierung (Araç Kredisi)",
    Icon: CreditCard,
    iconClass:
      "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  },
  {
    value: "SUBSCRIPTION",
    label: "Abonnement (Abonelik)",
    Icon: Tv,
    iconClass:
      "bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800",
  },
  {
    value: "OTHER",
    label: "Sonstiges (Diğer)",
    Icon: FileText,
    iconClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  },
];

const STATUS_OPTIONS: Array<{
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  isStruckThrough: boolean;
}> = [
  {
    value: "ACTIVE",
    label: "Aktiv (Aktif)",
    Icon: CheckCircle2,
    iconClass:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    isStruckThrough: false,
  },
  {
    value: "CANCELLATION_PLANNED",
    label: "Kündigung eingereicht (Çıkış Verildi)",
    Icon: Clock,
    iconClass:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    isStruckThrough: true,
  },
  {
    value: "CANCELLED",
    label: "Gekündigt (İptal / Çıkış Verildi)",
    Icon: XCircle,
    iconClass:
      "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    isStruckThrough: true,
  },
  {
    value: "EXPIRED",
    label: "Beendet / Abgelaufen (Bitmiş)",
    Icon: Ban,
    iconClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700",
    isStruckThrough: true,
  },
  {
    value: "ARCHIVED",
    label: "Archiviert (Arşivlendi / Bitmiş)",
    Icon: Archive,
    iconClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700",
    isStruckThrough: true,
  },
];

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalPaidCents: 0,
    totalPaidFormattedDe: "0,00 €",
    totalRemainingCents: 0,
    totalRemainingFormattedDe: "0,00 €",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Track which row's icon picker popover is open: e.g. { id: string, type: "status" | "category" } | null
  const [openPicker, setOpenPicker] = useState<{
    id: string;
    type: "status" | "category";
  } | null>(null);

  const [provider, setProvider] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ELECTRICITY");
  const [amountEur, setAmountEur] = useState("");
  const [paidAmountEur, setPaidAmountEur] = useState("");
  const [remainingAmountEur, setRemainingAmountEur] = useState("");
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
        setError(
          "Bitte melden Sie sich an (/login), um Ihre Verträge zu verwalten."
        );
        setContracts([]);
      } else if (!res.ok) {
        setError("Verträge konnten nicht geladen werden.");
      } else {
        const data = await res.json();
        setContracts(data.contracts ?? []);
        if (data.paymentSummary) {
          setPaymentSummary(data.paymentSummary);
        }
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
        paidAmountEur: paidAmountEur.trim() || undefined,
        remainingAmountEur: remainingAmountEur.trim() || undefined,
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
    setPaidAmountEur("");
    setRemainingAmountEur("");
    setStatus("ACTIVE");
    setShowForm(false);
    await loadContracts();
  }

  async function handlePatchContract(
    contractId: string,
    patch: Record<string, unknown>
  ) {
    setError(null);
    setOpenPicker(null);
    const res = await fetch(`/api/v1/agent/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setError("Vertrag konnte nicht aktualisiert werden.");
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
    const aStatus = STATUS_OPTIONS.find((s) => s.value === a.status);
    const bStatus = STATUS_OPTIONS.find((s) => s.value === b.status);
    const aStruck =
      Boolean(a.isTerminatedOrEnded) || (aStatus?.isStruckThrough ?? false);
    const bStruck =
      Boolean(b.isTerminatedOrEnded) || (bStatus?.isStruckThrough ?? false);
    if (aStruck !== bStruck) return aStruck ? 1 : -1;
    return 0;
  });

  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;

  return (
    <div
      className="space-y-6"
      onClick={() => {
        if (openPicker) setOpenPicker(null);
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-teal-600" />
            Verträge (Sözleşmeler)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Klicken Sie auf ein Icon (Kategorie oder Status), um es direkt zu ändern. Bisher gezahlte und verbleibende Beträge werden über Hermes Agent oder automatisch synchronisiert.
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

      {/* Payment Summary Cards (Bugüne Kadar Ödenen & Kalan Ödemeler) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Aktive Verträge (Aktif Sözleşmeler)
            </p>
            <p className="mt-1 text-2xl font-bold font-mono">
              {activeCount}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {contracts.length} gesamt
              </span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
            <FileSignature className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Bisher gezahlt (Bugüne Kadar Ödenen)
            </p>
            <p className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {paymentSummary.totalPaidFormattedDe}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Verbleibend / Rest (Kalan Ödemeler)
            </p>
            <p className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {paymentSummary.totalRemainingFormattedDe}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Hourglass className="w-5 h-5" />
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
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Monats-/Ratenbetrag in EUR (z. B. 49,90) *
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
                Bisher gezahlt in EUR (Bugüne Kadar Ödenen - opsiyonel)
              </label>
              <input
                placeholder="Automatisch oder z. B. 598,80"
                value={paidAmountEur}
                onChange={(e) => setPaidAmountEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Verbleibend in EUR (Kalan Ödeme - opsiyonel)
              </label>
              <input
                placeholder="Automatisch oder z. B. 598,80"
                value={remainingAmountEur}
                onChange={(e) => setRemainingAmountEur(e.target.value)}
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
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
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
        <div className="overflow-visible rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-14 text-center">Kat.</th>
                  <th className="px-4 py-3">Anbieter & Titel</th>
                  <th className="px-4 py-3">Rate / Monat</th>
                  <th className="px-4 py-3">Bisher gezahlt (Ödenen)</th>
                  <th className="px-4 py-3">Verbleibend (Kalan)</th>
                  <th className="px-4 py-3">Kündigungsfrist</th>
                  <th className="px-4 py-3 w-16 text-center">Status</th>
                  <th className="px-4 py-3 w-12 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedContracts.map((c) => {
                  const catMeta =
                    CATEGORY_OPTIONS.find((opt) => opt.value === c.category) ??
                    CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1]!;
                  const statusMeta =
                    STATUS_OPTIONS.find((opt) => opt.value === c.status) ??
                    STATUS_OPTIONS[0]!;

                  const CatIcon = catMeta.Icon;
                  const StatusIcon = statusMeta.Icon;

                  const isStruck =
                    Boolean(c.isTerminatedOrEnded) || statusMeta.isStruckThrough;
                  const textStrikeClass = isStruck
                    ? "line-through decoration-rose-500/80 dark:decoration-rose-400/80 decoration-2 text-slate-400 dark:text-slate-500"
                    : "";

                  const isCatOpen =
                    openPicker?.id === c.id && openPicker?.type === "category";
                  const isStatusOpen =
                    openPicker?.id === c.id && openPicker?.type === "status";

                  return (
                    <tr
                      key={c.id}
                      className={
                        isStruck
                          ? "bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 transition-colors"
                          : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      }
                    >
                      {/* 1. Unified Single Category Icon with Click Popover */}
                      <td className="px-4 py-3 text-center relative">
                        <button
                          type="button"
                          title={`${catMeta.label} — Klicken zum Ändern`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPicker(
                              isCatOpen
                                ? null
                                : { id: c.id, type: "category" }
                            );
                          }}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-transform hover:scale-105 ${catMeta.iconClass}`}
                        >
                          <CatIcon className="w-4 h-4" />
                        </button>

                        {isCatOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-4 top-12 z-30 flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
                          >
                            {CATEGORY_OPTIONS.map((opt) => {
                              const OptionIcon = opt.Icon;
                              const active = opt.value === c.category;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  title={opt.label}
                                  onClick={() =>
                                    handlePatchContract(c.id, {
                                      category: opt.value,
                                    })
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
                      </td>

                      {/* 2. Provider & Title */}
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

                      {/* 3. Monthly / Installment Rate */}
                      <td
                        className={`px-4 py-3 font-mono font-medium ${textStrikeClass}`}
                      >
                        {c.amountFormattedDe}
                      </td>

                      {/* 4. Paid So Far (Bugüne Kadar Ödenen) */}
                      <td className="px-4 py-3">
                        <div
                          className={`font-mono font-semibold ${
                            isStruck
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {c.paidFormattedDe}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c.effectivePaidInstallments} Raten gezahlt
                        </div>
                      </td>

                      {/* 5. Remaining Payments (Kalan Ödeme) + Progress Bar */}
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-mono font-semibold ${
                              isStruck
                                ? "line-through text-slate-400 dark:text-slate-500"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {c.remainingFormattedDe}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {c.paymentProgressPercent}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isStruck ? "bg-slate-400" : "bg-teal-600"
                            }`}
                            style={{ width: `${c.paymentProgressPercent}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {c.effectiveRemainingInstallments} Raten offen · Ende:{" "}
                          {c.renewalDateFormattedDe}
                        </div>
                      </td>

                      {/* 6. Cancellation Deadline */}
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

                      {/* 7. Unified Single Status Icon with Click Popover */}
                      <td className="px-4 py-3 text-center relative">
                        <button
                          type="button"
                          title={`${statusMeta.label} — Klicken zum Ändern`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPicker(
                              isStatusOpen
                                ? null
                                : { id: c.id, type: "status" }
                            );
                          }}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-transform hover:scale-105 ${statusMeta.iconClass}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                        </button>

                        {isStatusOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-4 top-12 z-30 flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
                          >
                            {STATUS_OPTIONS.map((opt) => {
                              const OptionIcon = opt.Icon;
                              const active = opt.value === c.status;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  title={opt.label}
                                  onClick={() =>
                                    handlePatchContract(c.id, {
                                      status: opt.value,
                                    })
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
                      </td>

                      {/* 8. Delete Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.title)}
                          title="Vertrag löschen"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
        </div>
      )}
    </div>
  );
}
