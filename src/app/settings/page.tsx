"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  Bot,
  KeyRound,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Globe,
  BellRing,
  Download,
  Save,
  CheckCircle2,
  PiggyBank,
  LogOut,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  // Persistent Theme & Locale
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(
    "light"
  );
  const [locale, setLocale] = useState<"de" | "tr">("de");

  // Household & Financial Preferences
  const [householdName, setHouseholdName] = useState("Akata Haushalt");
  const [monthlySavingsTargetEur, setMonthlySavingsTargetEur] =
    useState("500,00");
  const [monthlyExpenseLimitEur, setMonthlyExpenseLimitEur] =
    useState("2500,00");
  const [contractWarningDays, setContractWarningDays] = useState("30");
  const [timezone, setTimezone] = useState("Europe/Berlin");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Status & Feedback
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [testingNotif, setTestingNotif] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromStorage = () => {
      try {
        const storedLocale = localStorage.getItem("akatalife_locale");
        if (storedLocale === "de" || storedLocale === "tr") {
          setLocale(storedLocale);
        }
        const storedTheme = localStorage.getItem("akatalife_theme");
        if (
          storedTheme === "light" ||
          storedTheme === "dark" ||
          storedTheme === "system"
        ) {
          setThemeMode(storedTheme);
        } else {
          const isDark = document.documentElement.classList.contains("dark");
          setThemeMode(isDark ? "dark" : "light");
        }

        const rawPrefs = localStorage.getItem("akatalife_household_prefs");
        if (rawPrefs) {
          const parsed = JSON.parse(rawPrefs);
          if (parsed.householdName) setHouseholdName(parsed.householdName);
          if (parsed.monthlySavingsTargetEur)
            setMonthlySavingsTargetEur(parsed.monthlySavingsTargetEur);
          if (parsed.monthlyExpenseLimitEur)
            setMonthlyExpenseLimitEur(parsed.monthlyExpenseLimitEur);
          if (parsed.contractWarningDays)
            setContractWarningDays(String(parsed.contractWarningDays));
          if (parsed.timezone) setTimezone(parsed.timezone);
          if (typeof parsed.soundEnabled === "boolean")
            setSoundEnabled(parsed.soundEnabled);
        }
      } catch {}
    };

    syncFromStorage();
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.email) setUserEmail(d.user.email);
      })
      .catch(() => {});

    window.addEventListener("akatalife-prefs-changed", syncFromStorage);
    return () =>
      window.removeEventListener("akatalife-prefs-changed", syncFromStorage);
  }, []);

  function showSavedToast(msg: string) {
    setSavedBanner(msg);
    setTimeout(() => {
      setSavedBanner(null);
    }, 3000);
  }

  function handleSelectTheme(nextMode: "light" | "dark" | "system") {
    setThemeMode(nextMode);
    try {
      localStorage.setItem("akatalife_theme", nextMode);
      document.cookie = `akatalife_theme=${nextMode}; path=/; max-age=31536000`;
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark =
        nextMode === "dark" || (nextMode === "system" && prefersDark);
      document.documentElement.classList.toggle("dark", shouldBeDark);
      window.dispatchEvent(new Event("akatalife-prefs-changed"));
      showSavedToast(
        nextMode === "dark"
          ? "✓ Gece modu (Dark Mode) kalıcı olarak kaydedildi."
          : nextMode === "light"
            ? "✓ Gündüz modu (Light Mode) kalıcı olarak kaydedildi."
            : "✓ Sistem otomatik tema modu kalıcı olarak kaydedildi."
      );
    } catch {}
  }

  function handleSelectLocale(nextLocale: "de" | "tr") {
    setLocale(nextLocale);
    try {
      localStorage.setItem("akatalife_locale", nextLocale);
      document.cookie = `akatalife_locale=${nextLocale}; path=/; max-age=31536000`;
      document.documentElement.lang = nextLocale;
      window.dispatchEvent(new Event("akatalife-prefs-changed"));
      showSavedToast(
        nextLocale === "tr"
          ? "✓ Sistem dili Türkçe (TR) olarak kalıcı kaydedildi."
          : "✓ Systemsprache dauerhaft auf Deutsch (DE) gespeichert."
      );
    } catch {}
  }

  function handleSaveHouseholdPrefs(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        householdName,
        monthlySavingsTargetEur,
        monthlyExpenseLimitEur,
        contractWarningDays,
        timezone,
        soundEnabled,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        "akatalife_household_prefs",
        JSON.stringify(payload)
      );
      window.dispatchEvent(new Event("akatalife-prefs-changed"));
      showSavedToast(
        "✓ Hane, bütçe ve uyarı ayarları kalıcı olarak kaydedildi."
      );
    } catch {}
  }

  async function handleEnablePush() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      await handleSendTestNotification();
    }
  }

  async function handleSendTestNotification() {
    setTestingNotif(true);
    try {
      await fetch("/api/v1/agent/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Ayarlar — Canlı Bildirim Testi Başarılı",
          message: `${householdName} için gerçek zamanlı bildirimler ve sesli uyarı aktif.`,
          type: "INFO",
          priority: "HIGH",
          actionUrl: "/settings",
        }),
      });
      showSavedToast("✓ Canlı test bildirimi gönderildi!");
    } finally {
      setTestingNotif(false);
    }
  }

  async function handleCopyEndpoint(path: string) {
    try {
      const fullUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${path}`
          : `https://life.akata.nl${path}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedEndpoint(path);
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } catch {}
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const agentEndpoints = [
    {
      method: "GET",
      path: "/api/v1/agent/openapi.json",
      desc: "OpenAPI 3.1 Şeması (Hermes Agent keşif ucu)",
    },
    {
      method: "GET",
      path: "/api/v1/agent/summary",
      desc: "Tüm Hane, Sözleşme, Bütçe ve Tasarruf Özeti",
    },
    {
      method: "GET",
      path: "/api/v1/agent/health-score",
      desc: "Aylık Finansal Sağlık Skoru, Pozitif/Negatif Etkenler & Tavsiyeler",
    },
    {
      method: "POST",
      path: "/api/v1/agent/health-score/simulate",
      desc: "Skor Simülasyonu (Gider Azaltma / Gelir Artışı Senaryosu)",
    },
    {
      method: "GET | POST | PATCH",
      path: "/api/v1/agent/contracts",
      desc: "Sözleşmeler (Verträge), İkon Durumu & Ödenen/Kalan Taksit",
    },
    {
      method: "GET | POST | PATCH",
      path: "/api/v1/agent/advice",
      desc: "Hermes Tasarruf & Birikim Danışmanı (/advisor)",
    },
    {
      method: "GET | POST | PATCH",
      path: "/api/v1/agent/reports",
      desc: "Hermes Finansal & Sözleşme Raporları (/reports)",
    },
    {
      method: "GET | POST | PATCH",
      path: "/api/v1/agent/notifications",
      desc: "Gerçek Zamanlı Bildirim Gönderme & Okundu İşaretleme",
    },
    {
      method: "GET (SSE)",
      path: "/api/v1/agent/notifications/stream",
      desc: "Canlı Bildirim Akışı (Server-Sent Events)",
    },
    {
      method: "GET | POST",
      path: "/api/v1/agent/transactions",
      desc: "Gelir & Gider Kayıtları (EUR-Cent Hassasiyetli)",
    },
    {
      method: "GET | POST",
      path: "/api/v1/agent/documents",
      desc: "Belgeler & PDF/Görsel Yükleme",
    },
    {
      method: "GET | POST",
      path: "/api/v1/agent/invoices",
      desc: "Faturalar & Son Ödeme Tarihleri",
    },
    {
      method: "GET | POST",
      path: "/api/v1/agent/reminders",
      desc: "Hatırlatıcılar & Fesih Uyarıları",
    },
    {
      method: "GET | POST",
      path: "/api/v1/agent/home",
      desc: "Ev, Odalar, Cihazlar & Sayaç Okumaları (Zählerstände)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-600" />
            Einstellungen & Systemsteuerung (Ayarlar)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kalıcı Gece/Gündüz modu, Dil seçimi (DE/TR), Bütçe hedefleri, Canlı Bildirimler, Veri Yedekleme ve Hermes Agent API yönetimi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/system"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Sistem & Audit Log
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Persistent Save Confirmation Toast */}
      {savedBanner && (
        <div className="rounded-xl border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* 1. Appearance & Language (Kalıcı Gece/Gündüz Modu & Dil Seçimi) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Sun className="w-4 h-4 text-amber-500" />
              Gece / Gündüz Modu (Darstellung)
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              Kalıcı Kaydedilir
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Seçtiğiniz görünüm modu hem bu sayfadan hem de sol alttaki menüden değiştirildiğinde tarayıcı ve uygulama hafızasına kalıcı olarak kaydedilir.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleSelectTheme("light")}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                themeMode === "light"
                  ? "border-2 border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span>Gündüz (Hell)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTheme("dark")}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                themeMode === "dark"
                  ? "border-2 border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-500" />
              <span>Gece (Dunkel)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTheme("system")}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                themeMode === "system"
                  ? "border-2 border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
              }`}
            >
              <Monitor className="w-5 h-5 text-slate-500" />
              <span>Sistem Otomatik</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Globe className="w-4 h-4 text-teal-600" />
              Uygulama Dili (Sprache — DE / TR)
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              Kalıcı Kaydedilir
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Menüleri ve arayüz etiketlerini Almanca (DE) veya Türkçe (TR) olarak kalıcı sabitleyin. Para birimi (EUR €) ve tarih formatı (TT.MM.JJJJ) her zaman Almanya standardında korunur.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSelectLocale("de")}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                locale === "de"
                  ? "border-2 border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
              }`}
            >
              <span className="text-base">🇩🇪</span>
              <span>Deutsch (Standart)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectLocale("tr")}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                locale === "tr"
                  ? "border-2 border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
              }`}
            >
              <span className="text-base">🇹🇷</span>
              <span>Türkçe (TR)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Household, Budget & Savings Target Settings */}
      <form
        onSubmit={handleSaveHouseholdPrefs}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <PiggyBank className="w-4 h-4 text-teal-600" />
            Hane, Bütçe & Sözleşme Uyarı Parametreleri
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Ayarları Kalıcı Kaydet
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Hane Adı (Haushaltsname)
            </label>
            <input
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Aylık Tasarruf Hedefi (EUR)
            </label>
            <input
              value={monthlySavingsTargetEur}
              onChange={(e) => setMonthlySavingsTargetEur(e.target.value)}
              placeholder="500,00"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Aylık Gider Üst Limiti Uyarısı (EUR)
            </label>
            <input
              value={monthlyExpenseLimitEur}
              onChange={(e) => setMonthlyExpenseLimitEur(e.target.value)}
              placeholder="2500,00"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Sözleşme Fesih (Kündigungsfrist) Erken Uyarı Süresi
            </label>
            <select
              value={contractWarningDays}
              onChange={(e) => setContractWarningDays(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="14">14 Gün Önceden Uyar</option>
              <option value="30">30 Gün Önceden Uyar (Standart)</option>
              <option value="60">60 Gün Önceden Uyar</option>
              <option value="90">90 Gün Önceden Uyar (3 Ay)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Saat Dilimi (Zeitzone)
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="Europe/Berlin">Europe/Berlin (Almanya)</option>
              <option value="Europe/Amsterdam">Europe/Amsterdam (Hollanda)</option>
              <option value="Europe/Istanbul">Europe/Istanbul (Türkiye)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 w-full">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Bildirim Sesi ve Titreşim (Haptic) Aktif</span>
            </label>
          </div>
        </div>
      </form>

      {/* 3. Real-Time Notifications & Data Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <BellRing className="w-4 h-4 text-teal-600" />
            Gerçek Zamanlı Bildirimler (Echtzeit-Push & SSE)
          </div>
          <p className="text-xs text-slate-500">
            Hermes Agent yeni bir rapor, sözleşme uyarısı veya tasarruf tavsiyesi eklediğinde telefonunuza ve tarayıcınıza anında bildirim düşer.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {notifPermission !== "granted" ? (
              <button
                type="button"
                onClick={handleEnablePush}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                Cihaz Bildirimlerine İzin Ver
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Canlı Push Bildirimleri Aktif
              </span>
            )}
            <button
              type="button"
              disabled={testingNotif}
              onClick={handleSendTestNotification}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600 text-teal-700 dark:text-teal-300 px-3.5 py-2 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${testingNotif ? "animate-spin" : ""}`}
              />
              Canlı Test Bildirimi Gönder
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Download className="w-4 h-4 text-teal-600" />
            Veri Dışa Aktarma & Yedekleme (Datenexport & Backup)
          </div>
          <p className="text-xs text-slate-500">
            Tüm gelir/gider hareketlerinizi CSV olarak veya tüm hane/sözleşme verilerinizi JSON formatında istediğiniz an indirebilirsiniz.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/v1/agent/transactions/export"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3.5 py-2 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Gelir & Gider CSV İndir
            </a>
            <a
              href="/api/v1/agent/summary"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Tam Sistem Özeti (JSON)
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {userEmail ? `Hesap: ${userEmail}` : "Owner Giriş / Şifre"}
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Hermes Agent Full API Reference */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-teal-700 dark:text-teal-400">
            <Bot className="w-5 h-5" />
            Hermes Agent Vollzugriff (Tüm Aktif API Uçları)
          </div>
          <a
            href="/api/v1/agent/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-teal-600 hover:underline"
          >
            openapi.json aç ↗
          </a>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Hermes Agent,{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
            Authorization: Bearer &lt;HERMES_AGENT_API_KEY&gt;
          </code>{" "}
          veya{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
            X-Hermes-Api-Key: &lt;HERMES_AGENT_API_KEY&gt;
          </code>{" "}
          başlığı ile aşağıdaki tüm modülleri okuyabilir, veri ekleyebilir ve güncelleyebilir:
        </p>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {agentEndpoints.map((ep) => (
            <div
              key={ep.path}
              className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2.5 font-mono">
                <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                  {ep.method}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {ep.path}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-slate-500">{ep.desc}</span>
                <button
                  type="button"
                  onClick={() => handleCopyEndpoint(ep.path)}
                  title="URL Kopyala"
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  {copiedEndpoint === ep.path ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Hermes Agent tarafından yapılan her işlem otomatik olarak{" "}
            <code className="font-mono">akatalife.AuditEvent</code> tablosuna{" "}
            <code className="font-mono">actorType = HERMES_AGENT</code> olarak kaydedilir.
          </span>
        </div>
      </div>
    </div>
  );
}
