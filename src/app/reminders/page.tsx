"use client";

import React, { useEffect, useState } from "react";
import { Bell, Plus, AlertCircle } from "lucide-react";

interface ReminderItem {
  id: string;
  title: string;
  description: string | null;
  dueAtFormattedDe: string;
  priority: string;
  completedAt: string | null;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("2026-11-01");
  const [priority, setPriority] = useState("HIGH");

  async function loadReminders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/reminders");
      if (res.status === 401) {
        setError("Bitte melden Sie sich an (/login), um Erinnerungen zu verwalten.");
      } else if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders ?? []);
      }
    } catch {
      setError("Fehler beim Laden der Erinnerungen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReminders();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/v1/agent/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, dueAt, priority }),
    });
    if (!res.ok) {
      setError("Erinnerung konnte nicht gespeichert werden.");
      return;
    }
    setTitle("");
    setShowForm(false);
    await loadReminders();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-teal-600" />
            Termine & Erinnerungen (Takvim & Hatırlatıcılar)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Vertragsfristen, Rechnungsfälligkeiten, Garantieabläufe und eigene Erinnerungen (ohne Duplikate).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Erinnerung anlegen
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Titel *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Stromzähler ablesen"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fällig am *</label>
              <input
                type="date"
                required
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Priorität</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="LOW">Niedrig (Low)</option>
                <option value="MEDIUM">Mittel (Medium)</option>
                <option value="HIGH">Hoch (High)</option>
                <option value="CRITICAL">Kritisch (Critical)</option>
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
              Speichern
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Erinnerungen werden geladen…
        </div>
      ) : reminders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-2">
          <p className="text-sm font-medium">Keine Erinnerungen vorhanden</p>
          <p className="text-xs text-slate-500">
            Vertragsfristen und fällige Rechnungen erzeugen automatisch deduplizierte Erinnerungen.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-sm">{rem.title}</div>
                {rem.description && (
                  <div className="text-xs text-slate-500">{rem.description}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-semibold">
                  {rem.dueAtFormattedDe}
                </div>
                <span className="text-[11px] uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  {rem.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
