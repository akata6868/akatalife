"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [name, setName] = useState("Süleyman Akata");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedHermesKey, setGeneratedHermesKey] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            totpCode: totpCode || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.message || "Anmeldung fehlgeschlagen.");
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        const res = await fetch("/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.message || "Owner-Setup fehlgeschlagen.");
        } else {
          setGeneratedHermesKey(data.hermesAgentApiKey ?? null);
        }
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-teal-600" />
          {mode === "login"
            ? "Anmeldung — Akata Life"
            : "Einmaliges Owner-Setup"}
        </h1>
        <p className="text-xs text-slate-500">
          Privates Haushaltsmanagement · Öffentliche Registrierung ist deaktiviert.
        </p>
      </div>

      <div className="flex gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-1.5 rounded-md ${
            mode === "login"
              ? "bg-white dark:bg-slate-900 shadow-sm font-semibold"
              : "text-slate-500"
          }`}
        >
          Anmelden (Login)
        </button>
        <button
          type="button"
          onClick={() => setMode("setup")}
          className={`flex-1 py-1.5 rounded-md ${
            mode === "setup"
              ? "bg-white dark:bg-slate-900 shadow-sm font-semibold"
              : "text-slate-500"
          }`}
        >
          Erstinstallation (Setup)
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/50 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {generatedHermesKey ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4" />
            Owner-Konto & Hermes Agent API-Key erstellt!
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Bitte kopieren Sie Ihren Hermes Agent API-Schlüssel jetzt (er wird in der Datenbank nur als SHA-256-Hash gespeichert):
          </p>
          <pre className="p-2.5 rounded bg-slate-900 text-teal-300 font-mono text-xs overflow-x-auto">
            {generatedHermesKey}
          </pre>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold"
          >
            Weiter zum Dashboard →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "setup" && (
            <div>
              <label className="block text-xs font-medium mb-1">Name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">E-Mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Passwort (mind. 10 Zeichen) *
            </label>
            <input
              type="password"
              required
              minLength={mode === "setup" ? 10 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          {mode === "login" && (
            <div>
              <label className="block text-xs font-medium mb-1">
                2FA TOTP-Code (falls aktiviert)
              </label>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-stelliger Code"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors"
          >
            {loading
              ? "Bitte warten…"
              : mode === "login"
                ? "Sicher anmelden"
                : "Owner-Konto initialisieren"}
          </button>
        </form>
      )}
    </div>
  );
}
