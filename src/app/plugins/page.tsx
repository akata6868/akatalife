"use client";

import React, { useEffect, useState } from "react";
import {
  Blocks,
  Bot,
  Cpu,
  Sparkles,
  Webhook,
  Plus,
  RefreshCw,
  Download,
  Code2,
  Play,
  Settings2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Power,
} from "lucide-react";

interface PluginItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  enabled: boolean;
  status: string;
  baseUrl: string;
  webhookUrl: string;
  hasApiKey: boolean;
  capabilities: string[];
  configJson: Record<string, unknown>;
  lastPingAtFormattedDe: string | null;
  lastPingStatus: string | null;
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Mark-LV Python script viewer & live command tester
  const [showMarkLvCode, setShowMarkLvCode] = useState(false);
  const [markLvScript, setMarkLvScript] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [jarvisAction, setJarvisAction] = useState("summary");
  const [jarvisTitle, setJarvisTitle] = useState("");
  const [jarvisAmountEur, setJarvisAmountEur] = useState("");
  const [jarvisSpeechReply, setJarvisSpeechReply] = useState<string | null>(
    null
  );
  const [jarvisRunning, setJarvisRunning] = useState(false);

  // Edit / Configure modal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBaseUrl, setEditBaseUrl] = useState("");
  const [editWebhookUrl, setEditWebhookUrl] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [pingingId, setPingingId] = useState<string | null>(null);

  // Add new custom plugin form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("AI_ASSISTANT");
  const [newDescription, setNewDescription] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  async function loadPlugins() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/agent/plugins", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins ?? []);
      }
    } catch {
      setErrorBanner("Eklentiler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlugins();
  }, []);

  async function handleViewMarkLvCode() {
    if (showMarkLvCode) {
      setShowMarkLvCode(false);
      return;
    }
    const res = await fetch("/api/v1/agent/plugins/mark-lv?format=json");
    if (res.ok) {
      const data = await res.json();
      setMarkLvScript(data.script || "");
      setShowMarkLvCode(true);
    }
  }

  async function handleCopyMarkLvCode() {
    try {
      await navigator.clipboard.writeText(markLvScript);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  }

  async function handleRunJarvisCommand(e: React.FormEvent) {
    e.preventDefault();
    setJarvisRunning(true);
    setJarvisSpeechReply(null);
    try {
      const res = await fetch("/api/v1/agent/plugins/mark-lv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: jarvisAction,
          title: jarvisTitle,
          amountEur: jarvisAmountEur,
          message: jarvisTitle,
        }),
      });
      const data = await res.json();
      setJarvisSpeechReply(
        data.speechText || JSON.stringify(data, null, 2)
      );
    } catch {
      setJarvisSpeechReply("Mark-LV köprüsü çağrılırken hata oluştu.");
    } finally {
      setJarvisRunning(false);
    }
  }

  async function handleTogglePlugin(plugin: PluginItem) {
    const res = await fetch("/api/v1/agent/plugins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: plugin.id,
        enabled: !plugin.enabled,
      }),
    });
    if (res.ok) {
      await loadPlugins();
    }
  }

  async function handlePingPlugin(id: string) {
    setPingingId(id);
    setStatusBanner(null);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/v1/agent/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping", id }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatusBanner(`✓ ${data.message}`);
      } else {
        setErrorBanner(data.message || "Bağlantı testi başarısız.");
      }
      await loadPlugins();
    } finally {
      setPingingId(null);
    }
  }

  function startEditing(p: PluginItem) {
    setEditingId(p.id);
    setEditBaseUrl(p.baseUrl || "");
    setEditWebhookUrl(p.webhookUrl || "");
    setEditApiKey("");
  }

  async function handleSaveEdit(e: React.FormEvent, id: string) {
    e.preventDefault();
    setStatusBanner(null);
    setErrorBanner(null);
    const res = await fetch("/api/v1/agent/plugins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        baseUrl: editBaseUrl,
        webhookUrl: editWebhookUrl,
        ...(editApiKey.trim() ? { apiKey: editApiKey.trim() } : {}),
      }),
    });
    if (res.ok) {
      setEditingId(null);
      setStatusBanner(
        "✓ Eklenti bağlantı ve token ayarları şifrelenerek kaydedildi."
      );
      await loadPlugins();
    } else {
      setErrorBanner("Ayarlar kaydedilemedi.");
    }
  }

  async function handleCreatePlugin(e: React.FormEvent) {
    e.preventDefault();
    setStatusBanner(null);
    setErrorBanner(null);
    const res = await fetch("/api/v1/agent/plugins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        category: newCategory,
        description: newDescription,
        baseUrl: newBaseUrl,
        webhookUrl: newWebhookUrl,
        apiKey: newApiKey,
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewDescription("");
      setNewBaseUrl("");
      setNewWebhookUrl("");
      setNewApiKey("");
      setShowNewForm(false);
      setStatusBanner("✓ Yeni eklenti başarıyla oluşturuldu.");
      await loadPlugins();
    }
  }

  async function handleQuickTemplate(template: {
    slug: string;
    name: string;
    category: string;
    description: string;
    baseUrl: string;
  }) {
    setNewName(template.name);
    setNewCategory(template.category);
    setNewDescription(template.description);
    setNewBaseUrl(template.baseUrl);
    setShowNewForm(true);
  }

  async function handleDeletePlugin(id: string) {
    await fetch(`/api/v1/agent/plugins?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadPlugins();
  }

  function renderIcon(iconName: string) {
    if (iconName === "Cpu") return <Cpu className="w-5 h-5 text-teal-600" />;
    if (iconName === "Sparkles")
      return <Sparkles className="w-5 h-5 text-amber-500" />;
    if (iconName === "Bot") return <Bot className="w-5 h-5 text-indigo-600" />;
    return <Webhook className="w-5 h-5 text-teal-600" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Blocks className="w-6 h-6 text-teal-600" />
            Plugins & Dış Uygulama Entegrasyonları (Mark-LV Jarvis & Home Assistant)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mark-LV (J.A.R.V.I.S.), Home Assistant, n8n, Telegram ve dış servisleri eklenti olarak bağlayın. (Hermes Agent doğrudan yerleşik API üzerinden çalışır).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadPlugins}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yenile
          </button>
          <button
            type="button"
            onClick={() => setShowNewForm(!showNewForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Eklenti Ekle
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs font-semibold text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Special Feature Box: FatihMakes/Mark-LV (J.A.R.V.I.S.) Integration */}
      <div className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-50/70 via-white to-teal-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-teal-950/20 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
              <Bot className="w-3.5 h-3.5" />
              FatihMakes / Mark-LV (J.A.R.V.I.S.) Resmi Köprü Eklentisi
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Mark-LV Sesli & Holografik Asistan Entegrasyonu (`plugins/akata_life.py`)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              <strong>Mark-LV</strong> projenizin <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">plugins/</code> klasörüne aşağıdaki <strong>akata_life.py</strong> dosyasını bıraktığınız anda JARVIS otomatik olarak Akata Life sisteminizi tanır. Sesli olarak <em>&quot;Hey Jarvis, sözleşmelerimin durumunu oku&quot;</em>, <em>&quot;45 Euro market gideri ekle&quot;</em> veya <em>&quot;Tasarruf tavsiyelerimi söyle&quot;</em> diyebilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="/api/v1/agent/plugins/mark-lv"
              download="akata_life.py"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm"
            >
              <Download className="w-4 h-4" />
              akata_life.py İndir
            </a>
            <button
              type="button"
              onClick={handleViewMarkLvCode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              {showMarkLvCode ? "Kodu Gizle" : "Python Kodunu Gör"}
            </button>
          </div>
        </div>

        {showMarkLvCode && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-100 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-mono">
                Hedef Dosya: Mark-LV/plugins/akata_life.py
              </span>
              <button
                type="button"
                onClick={handleCopyMarkLvCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Kodu Kopyala
                  </>
                )}
              </button>
            </div>
            <pre className="text-[11px] font-mono overflow-x-auto max-h-80 leading-relaxed">
              {markLvScript}
            </pre>
          </div>
        )}

        {/* Live JARVIS Bridge Command Simulator */}
        <form
          onSubmit={handleRunJarvisCommand}
          className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-white/90 dark:bg-slate-900/90 p-4 space-y-3"
        >
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" />
            Canlı Mark-LV (J.A.R.V.I.S.) Sesli Yanıt & Komut Testi
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                JARVIS Komutu (Action)
              </label>
              <select
                value={jarvisAction}
                onChange={(e) => setJarvisAction(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
              >
                <option value="summary">Genel Hane & Bütçe Özeti (summary)</option>
                <option value="contracts">Sözleşmeler & Kalan Ödemeler (contracts)</option>
                <option value="advisor">Tasarruf & Birikim Tavsiyeleri (advisor)</option>
                <option value="reports">Son Finansal Rapor (reports)</option>
                <option value="add_expense">Yeni Gider Kaydet (add_expense)</option>
                <option value="add_income">Yeni Gelir Kaydet (add_income)</option>
                <option value="notify">Canlı Bildirim Gönder (notify)</option>
              </select>
            </div>
            {(jarvisAction === "add_expense" ||
              jarvisAction === "add_income" ||
              jarvisAction === "notify") && (
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Açıklama / Başlık
                </label>
                <input
                  value={jarvisTitle}
                  onChange={(e) => setJarvisTitle(e.target.value)}
                  placeholder="Örn: REWE Market / Jarvis Test"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs"
                />
              </div>
            )}
            {(jarvisAction === "add_expense" ||
              jarvisAction === "add_income") && (
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Tutar (EUR)
                </label>
                <input
                  value={jarvisAmountEur}
                  onChange={(e) => setJarvisAmountEur(e.target.value)}
                  placeholder="45,90"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs font-mono"
                />
              </div>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={jarvisRunning}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                {jarvisRunning ? "Çalışıyor…" : "JARVIS Komutunu Çalıştır"}
              </button>
            </div>
          </div>

          {jarvisSpeechReply && (
            <div className="rounded-lg bg-indigo-950 text-indigo-100 p-3 text-xs font-mono border border-indigo-800">
              <span className="text-indigo-400 font-bold">JARVIS Sesli Yanıtı: </span>
              {jarvisSpeechReply}
            </div>
          )}
        </form>
      </div>

      {/* Quick Plugin Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() =>
            handleQuickTemplate({
              slug: "n8n-webhook",
              name: "n8n / Node-RED Otomasyon Köprüsü",
              category: "AUTOMATION",
              description:
                "Faturalar, sözleşme fesih tarihleri ve bütçe uyarıları için çift yönlü n8n / Node-RED webhook otomasyonu.",
              baseUrl: "https://n8n.example.com/webhook/akatalife",
            })
          }
          className="text-left p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 bg-white/60 dark:bg-slate-900/60 transition-colors cursor-pointer"
        >
          <div className="text-xs font-bold text-teal-700 dark:text-teal-400">
            + n8n / Node-RED Eklentisi Kur
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Otomasyon iş akışlarını bağlamak için tıklayın
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            handleQuickTemplate({
              slug: "telegram-bot",
              name: "Telegram / WhatsApp Bildirim Köprüsü",
              category: "MESSAGING",
              description:
                "Kritik sözleşme bitiş ve fatura uyarılarını Telegram veya WhatsApp botunuza iletir.",
              baseUrl: "https://api.telegram.org",
            })
          }
          className="text-left p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 bg-white/60 dark:bg-slate-900/60 transition-colors cursor-pointer"
        >
          <div className="text-xs font-bold text-teal-700 dark:text-teal-400">
            + Telegram / Mesajlaşma Botu Kur
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Anlık mesajlaşma bildirim kanalı ekleyin
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            handleQuickTemplate({
              slug: "custom-ai-agent",
              name: "Özel AI Asistan / REST API Eklentisi",
              category: "CUSTOM",
              description:
                "Herhangi bir yerel veya bulut AI ajanını (Ollama, OpenWebUI, Custom Agent) Akata Life API ile bağlayın.",
              baseUrl: "http://localhost:11434",
            })
          }
          className="text-left p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 bg-white/60 dark:bg-slate-900/60 transition-colors cursor-pointer"
        >
          <div className="text-xs font-bold text-teal-700 dark:text-teal-400">
            + Özel AI / Webhook Eklentisi Kur
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Kendi özel servisinizi veya yerel modelinizi ekleyin
          </p>
        </button>
      </div>

      {/* New Plugin Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreatePlugin}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="text-sm font-bold">Yeni Eklenti / Uygulama Bağla</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Eklenti / Uygulama Adı *
              </label>
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Örn: J.A.R.V.I.S. Masaüstü / n8n"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategori</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="AI_ASSISTANT">AI Asistan (Jarvis / Hermes / LLM)</option>
                <option value="SMART_HOME">Akıllı Ev & Enerji (Home Assistant)</option>
                <option value="AUTOMATION">Otomasyon (n8n / Node-RED / Webhook)</option>
                <option value="MESSAGING">Mesajlaşma (Telegram / WhatsApp / Discord)</option>
                <option value="CUSTOM">Özel REST API Servisi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Servis Base URL
              </label>
              <input
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
                placeholder="https://ha.akata.nl veya http://192.168.1.50:8123"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Webhook / Callback URL (İsteğe Bağlı)
              </label>
              <input
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                API Key / Access Token (AES-256-GCM ile Şifrelenir)
              </label>
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="Bearer Token veya API Anahtarı…"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Açıklama</label>
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Bu eklentinin görevi…"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold cursor-pointer"
            >
              Eklentiyi Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Installed Plugins List */}
      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Eklentiler yükleniyor…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {plugins.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-5 space-y-4 transition-all ${
                p.enabled
                  ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  : "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {renderIcon(p.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm">{p.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.enabled && p.status === "CONNECTED"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : p.status === "ERROR"
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {p.enabled ? p.status : "DEVRE DIŞI"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePlugin(p)}
                  title={p.enabled ? "Devre Dışı Bırak" : "Aktif Et"}
                  className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer shrink-0 ${
                    p.enabled
                      ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {p.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                  >
                    {cap}
                  </span>
                ))}
                {p.hasApiKey && (
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                    🔒 AES-256 Token Kayıtlı
                  </span>
                )}
              </div>

              <div className="text-[11px] font-mono text-slate-500 space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">URL: </span>
                  {p.baseUrl || "Henüz girilmedi"}
                </div>
                {p.lastPingStatus && (
                  <div>
                    <span className="text-slate-400">Durum: </span>
                    {p.lastPingStatus}{" "}
                    {p.lastPingAtFormattedDe
                      ? `(${p.lastPingAtFormattedDe})`
                      : ""}
                  </div>
                )}
              </div>

              {editingId === p.id && (
                <form
                  onSubmit={(e) => handleSaveEdit(e, p.id)}
                  className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800"
                >
                  <div>
                    <label className="block text-[11px] font-medium mb-1">
                      Servis Base URL (Örn: https://ha.akata.nl)
                    </label>
                    <input
                      value={editBaseUrl}
                      onChange={(e) => setEditBaseUrl(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">
                      Webhook / Köprü URL
                    </label>
                    <input
                      value={editWebhookUrl}
                      onChange={(e) => setEditWebhookUrl(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">
                      Yeni API Key / Long-Lived Token (AES-256-GCM)
                    </label>
                    <input
                      type="password"
                      value={editApiKey}
                      onChange={(e) => setEditApiKey(e.target.value)}
                      placeholder={
                        p.hasApiKey
                          ? "Mevcut şifreli token korunuyor (değiştirmek için yazın)…"
                          : "Token veya API anahtarı girin…"
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Kaydet
                    </button>
                  </div>
                </form>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pingingId === p.id}
                    onClick={() => handlePingPlugin(p.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        pingingId === p.id ? "animate-spin" : ""
                      }`}
                    />
                    Bağlantıyı Test Et
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editingId === p.id
                        ? setEditingId(null)
                        : startEditing(p)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Yapılandır
                  </button>
                </div>

                {p.slug !== "mark-lv-jarvis" &&
                  p.slug !== "home-assistant" &&
                  p.slug !== "hermes-agent" && (
                    <button
                      type="button"
                      onClick={() => handleDeletePlugin(p.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      title="Eklentiyi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
