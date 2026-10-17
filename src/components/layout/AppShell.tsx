"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileSignature,
  FolderLock,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Bell,
  BellRing,
  Home,
  Cpu,
  BarChart3,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  Globe,
  Bot,
  LogOut,
  PiggyBank,
  Menu,
  X,
  CheckCheck,
} from "lucide-react";
import { dictionaries, Locale } from "@/lib/i18n/dictionaries";

interface AppShellProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  actionUrl: string | null;
  isRead: boolean;
  createdBy: string;
  createdAtFormattedDe: string;
}

export function AppShell({ children, initialLocale = "de" }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [dark, setDark] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Real-time notifications & PWA install state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [liveToast, setLiveToast] = useState<NotificationItem | null>(null);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const t = dictionaries[locale];
  const isLoginPage = pathname === "/login";

  // Register Service Worker, check Notification permission & capture PWA install prompt
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as any).standalone);
    setIsStandalone(standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  useEffect(() => {
    if (isLoginPage) {
      setAuthChecked(true);
      return;
    }
    setAuthChecked(false);
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        setUserEmail(data.user?.email ?? null);
        setAuthChecked(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [isLoginPage, pathname, router]);

  function playNotificationChime() {
    if (typeof window === "undefined") return;
    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([180, 80, 180]);
      }
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Ignore if autoplay audio is blocked before interaction
    }
  }

  function triggerNativeNotification(item: NotificationItem) {
    playNotificationChime();
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    if (
      "serviceWorker" in navigator &&
      navigator.serviceWorker.controller
    ) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        id: item.id,
        title: item.title,
        message: item.message,
        actionUrl: item.actionUrl || "/",
      });
    } else {
      try {
        new Notification(item.title, {
          body: item.message,
          icon: "/icon",
        });
      } catch {
        // Ignore on platforms requiring SW registration
      }
    }
  }

  function processIncomingNotifications(
    list: NotificationItem[],
    unread: number
  ) {
    setNotifications(list);
    setUnreadCount(unread);

    if (!initialLoadDoneRef.current) {
      for (const item of list) {
        seenIdsRef.current.add(item.id);
      }
      initialLoadDoneRef.current = true;
      return;
    }

    for (const item of list) {
      if (!seenIdsRef.current.has(item.id)) {
        seenIdsRef.current.add(item.id);
        if (!item.isRead) {
          setLiveToast(item);
          triggerNativeNotification(item);
        }
      }
    }
  }

  async function pollNotifications() {
    try {
      const res = await fetch("/api/v1/agent/notifications", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      processIncomingNotifications(
        data.notifications ?? [],
        Number(data.unreadCount ?? 0)
      );
    } catch {
      // Ignore network hiccups during background poll
    }
  }

  // Real-time SSE stream (/api/v1/agent/notifications/stream) + fallback polling
  useEffect(() => {
    if (isLoginPage || !authChecked) return;
    pollNotifications();

    let es: EventSource | null = null;
    if (typeof window !== "undefined" && "EventSource" in window) {
      es = new EventSource("/api/v1/agent/notifications/stream");
      es.addEventListener("notifications", (evt: MessageEvent) => {
        try {
          const parsed = JSON.parse(evt.data);
          processIncomingNotifications(
            parsed.notifications ?? [],
            Number(parsed.unreadCount ?? 0)
          );
        } catch {}
      });
    }

    const interval = setInterval(pollNotifications, 10000);
    return () => {
      clearInterval(interval);
      if (es) es.close();
    };
  }, [isLoginPage, authChecked]);

  async function requestPushPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      await sendTestNotification();
    }
  }

  async function sendTestNotification() {
    await fetch("/api/v1/agent/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Akata Life — Canlı Bildirim Aktif",
        message:
          "Gerçek zamanlı bildirim sistemi ve uygulama modu sorunsuz çalışıyor.",
        type: "INFO",
        priority: "HIGH",
        actionUrl: "/advisor",
      }),
    });
    await pollNotifications();
  }

  async function handleInstallApp() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => {});
      setDeferredInstallPrompt(null);
    } else {
      setShowInstallHelp(true);
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/v1/agent/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await pollNotifications();
  }

  async function handleNotificationClick(item: NotificationItem) {
    setNotifOpen(false);
    setLiveToast(null);
    if (!item.isRead) {
      await fetch("/api/v1/agent/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      await pollNotifications();
    }
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  }

  const toggleTheme = () => {
    const nextDark = !dark;
    setDark(nextDark);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", nextDark);
    }
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen flex flex-col justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4">
        {children}
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 text-xs font-medium">
        Sitzung wird überprüft…
      </div>
    );
  }

  const navItems = [
    { href: "/", label: t.nav.dashboard, icon: LayoutDashboard, active: true },
    { href: "/advisor", label: t.nav.advisor, icon: PiggyBank, active: true },
    { href: "/contracts", label: t.nav.contracts, icon: FileSignature, active: true },
    { href: "/finances", label: t.nav.finances, icon: Wallet, active: true },
    { href: "/reports", label: t.nav.reports, icon: BarChart3, active: true },
    { href: "/documents", label: t.nav.documents, icon: FolderLock, active: true },
    { href: "/income", label: t.nav.income, icon: TrendingUp, active: true },
    { href: "/expenses", label: t.nav.expenses, icon: TrendingDown, active: true },
    { href: "/invoices", label: t.nav.invoices, icon: Receipt, active: true },
    { href: "/reminders", label: t.nav.reminders, icon: Bell, active: true },
    { href: "/home", label: t.nav.home, icon: Home, active: true },
    { href: "/energy", label: t.nav.energy, icon: Cpu, active: true },
    { href: "/settings", label: t.nav.settings, icon: Settings, active: true },
    { href: "/system", label: t.nav.system, icon: ShieldCheck, active: true },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none sm:select-auto">
      {/* Real-Time Live Toast Banner */}
      {liveToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 rounded-2xl border border-teal-500 bg-white dark:bg-slate-900 p-4 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div
            onClick={() => handleNotificationClick(liveToast)}
            className="flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                Hermes Echtzeit-Meldung
              </span>
            </div>
            <p className="text-sm font-semibold mt-0.5">{liveToast.title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
              {liveToast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold tracking-tight text-teal-700 dark:text-teal-400">
              {t.appName}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[130px]">
              {userEmail || "Europe/Berlin · EUR"}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Notification Bell Button */}
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              title="Benachrichtigungen (Bildirimler)"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
            >
              <Bell className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setLocale(locale === "de" ? "tr" : "de")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Globe className="w-3.5 h-3.5" />
            {locale === "de" ? "DE" : "TR"}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Abmelden"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit
          </button>
        </div>
      </aside>

      {/* Notification Center Modal / Popover */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-start justify-end lg:justify-start lg:pl-64 p-4"
          onClick={() => setNotifOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-bold">
                  Benachrichtigungen (Bildirimler)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={sendTestNotification}
                  className="px-2 py-1 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold"
                >
                  Test Bildirimi
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Alle gelesen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Push Permission & App Install Bar */}
            <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-900 space-y-2">
              {notifPermission !== "granted" ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-teal-800 dark:text-teal-200">
                    Canlı Cihaz Bildirimleri (Push):
                  </span>
                  <button
                    type="button"
                    onClick={requestPushPermission}
                    className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold shrink-0"
                  >
                    Bildirimleri Aç (Aktivieren)
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <span>✓ Gerçek zamanlı bildirimler aktif (SSE + Push)</span>
                </div>
              )}

              {!isStandalone && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-teal-200/60 dark:border-teal-900">
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Telefon / Masaüstü App Modu:
                  </span>
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="px-3 py-1 rounded-lg border border-teal-600 text-teal-700 dark:text-teal-300 text-xs font-semibold"
                  >
                    Uygulama Olarak Kur
                  </button>
                </div>
              )}

              {showInstallHelp && (
                <div className="rounded-lg bg-white dark:bg-slate-900 p-2.5 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 space-y-1">
                  <p>
                    <strong>iPhone / iPad (Safari):</strong> Alt bardaki{" "}
                    <strong>Paylaş (Teilen)</strong> ikonuna dokunun ve{" "}
                    <strong>&quot;Ana Ekrana Ekle (Zum Home-Bildschirm)&quot;</strong>{" "}
                    seçeneğine basın.
                  </p>
                  <p>
                    <strong>Android / Bilgisayar (Chrome):</strong> Sağ üst menüden{" "}
                    <strong>&quot;Uygulamayı Yükle / Ana ekrana ekle&quot;</strong>{" "}
                    seçeneğine tıklayın.
                  </p>
                </div>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Noch keine Benachrichtigungen vorhanden.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      !n.isRead
                        ? "bg-teal-50/40 dark:bg-teal-950/20"
                        : "opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                        )}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {n.createdAtFormattedDe}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {n.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Full App Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-72 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="font-bold text-teal-700 dark:text-teal-400">
                  {t.appName} Menü
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isCurrent
                          ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Native-Style Mobile App Top Bar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-teal-700 dark:text-teal-400">
              {t.appName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              <Bell className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "de" ? "tr" : "de")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800"
            >
              {locale.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-teal-700 text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>

        {/* Native PWA Bottom Tab Bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 flex justify-around py-2 px-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isCurrent = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium ${
                  isCurrent
                    ? "text-teal-700 dark:text-teal-400 font-semibold"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <Menu className="w-4 h-4" />
            <span>Menü</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
