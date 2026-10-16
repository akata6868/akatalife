"use client";

import React, { useEffect, useState } from "react";
import { FolderLock, Upload, Download, AlertCircle } from "lucide-react";

interface DocumentItem {
  id: string;
  title: string;
  originalFilename: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  amountFormattedDe: string | null;
  createdAtFormattedDe: string;
  downloadUrl: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("CONTRACT");
  const [amountEur, setAmountEur] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agent/documents");
      if (res.status === 401) {
        setError("Bitte melden Sie sich an (/login), um auf Ihre privaten Dokumente zuzugreifen.");
        setDocuments([]);
      } else if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents ?? []);
      }
    } catch {
      setError("Fehler beim Laden der Dokumente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    formData.append("category", category);
    if (amountEur) formData.append("amountEur", amountEur);

    const res = await fetch("/api/v1/agent/documents", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || "Dokument konnte nicht hochgeladen werden.");
      return;
    }

    setTitle("");
    setAmountEur("");
    setFile(null);
    setShowUpload(false);
    await loadDocuments();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderLock className="w-6 h-6 text-teal-600" />
            Dokumente (Özel Belge Arşivi)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Geschützter Dokumentenspeicher außerhalb des Web-Roots mit Magic-Byte-Prüfung (PDF, JPEG, PNG, WEBP).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold"
        >
          <Upload className="w-4 h-4" />
          Dokument hochladen
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold">Privates Dokument hochladen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Titel *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Stromabrechnung 2026"
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
                <option value="CONTRACT">Vertrag</option>
                <option value="UTILITY_BILL">Strom- & Gasrechnung</option>
                <option value="TELECOM_BILL">Internet & Mobilfunk</option>
                <option value="INSURANCE">Versicherung</option>
                <option value="RENT_HOUSING">Miete & Wohnen</option>
                <option value="EMPLOYMENT_PAYSLIP">Gehaltsabrechnung</option>
                <option value="TAX">Steuer</option>
                <option value="PUBLIC_ADMIN_JOBCENTER">Behörden & Jobcenter</option>
                <option value="VEHICLE">Fahrzeug</option>
                <option value="WARRANTY_RECEIPT">Garantie & Kassenbon</option>
                <option value="OTHER">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Optionaler Betrag (EUR)
              </label>
              <input
                placeholder="z. B. 120,50"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Datei (PDF, JPG, PNG, WEBP) *
              </label>
              <input
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold"
            >
              Sicher hochladen
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Dokumente werden geladen…
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-2">
          <p className="text-sm font-medium">Keine Dokumente vorhanden</p>
          <p className="text-xs text-slate-500">
            Laden Sie PDFs oder Belege hoch. Alle Dateien werden außerhalb des öffentlichen Webverzeichnisses verschlüsselt/geschützt abgelegt.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Titel & Dateiname</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Betrag</th>
                <th className="px-4 py-3">Hochgeladen am</th>
                <th className="px-4 py-3">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{doc.title}</div>
                    <div className="text-xs text-slate-500">
                      {doc.originalFilename} ({Math.round(doc.sizeBytes / 1024)} KB)
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{doc.category}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {doc.amountFormattedDe ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{doc.createdAtFormattedDe}</td>
                  <td className="px-4 py-3 text-xs">
                    <a
                      href={`${doc.downloadUrl}?download=1`}
                      className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-medium hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
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
