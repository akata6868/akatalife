"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { dictionaries, Locale } from "@/lib/i18n/dictionaries";

interface AppShellProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function AppShell({ children, initialLocale = "de" }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [dark, setDark] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const t = dictionaries[locale];

  const isLoginPage = pathname === "/login";

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

  // Render clean standalone layout on /login without sidebar or navigation
  if (isLoginPage) {
    return (
      <div className="min-h-screen flex flex-col justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4">
        {children}
      </div>
    );
  }

  // Block rendering protected UI until database session is verified
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
    { href: "/documents", label: t.nav.documents, icon: FolderLock, active: true },
    { href: "/finances", label: t.nav.finances, icon: Wallet, active: true },
    { href: "/income", label: t.nav.income, icon: TrendingUp, active: true },
    { href: "/expenses", label: t.nav.expenses, icon: TrendingDown, active: true },
    { href: "/invoices", label: t.nav.invoices, icon: Receipt, active: true },
    { href: "/reminders", label: t.nav.reminders, icon: Bell, active: true },
    { href: "/home", label: t.nav.home, icon: Home, active: true },
    { href: "/energy", label: t.nav.energy, icon: Cpu, active: true },
    { href: "/reports", label: t.nav.reports, icon: BarChart3, active: true },
    { href: "/settings", label: t.nav.settings, icon: Settings, active: true },
    { href: "/system", label: t.nav.system, icon: ShieldCheck, active: true },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold tracking-tight text-teal-700 dark:text-teal-400">
              {t.appName}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[140px]">
              {userEmail || "Europe/Berlin · EUR"}
            </p>
          </div>
          <span
            title={t.hermes.description}
            className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
          >
            <Bot className="w-3.5 h-3.5" />
            Hermes
          </span>
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

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-teal-700 dark:text-teal-400">
              {t.appName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocale(locale === "de" ? "tr" : "de")}
              className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800"
            >
              {locale.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>

        {/* iPhone PWA Bottom Navigation */}
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
                    ? "text-teal-700 dark:text-teal-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
