"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useI18n, LOCALES, type Locale } from "@/lib/i18n";
import { useTheme } from "@/components/providers/theme-provider";
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Languages,
  Users,
  Settings,
  Eye,
  ExternalLink,
  Copy,
  Check,
  ScanLine,
  Home,
  ClipboardList,
  MapPin,
  CheckCircle2,
  Shield,
} from "lucide-react";

interface AdminSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    plan?: string;
  };
}

interface EventContext {
  id: string;
  title: string;
  slug: string;
  guestCount: number;
  status: string;
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [eventCtx, setEventCtx] = useState<EventContext | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Detect if we're inside an event page (only after mount to avoid hydration mismatch)
  const eventIdMatch = mounted ? pathname.match(/\/events\/([^/]+)/) : null;
  const activeEventId = eventIdMatch?.[1] || null;

  // Detect active sub-page
  const activeSubPage = activeEventId
    ? pathname.replace(`/events/${activeEventId}`, "").replace(/^\//, "") || "overview"
    : null;

  // Fetch event context when inside an event
  useEffect(() => {
    if (!activeEventId) {
      setEventCtx(null);
      return;
    }

    // Only fetch if we don't have this event cached
    if (eventCtx?.id === activeEventId) return;

    fetch(`/api/events/${activeEventId}/guests`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed");
      })
      .then((data) => {
        // We can't easily get the title from the guests API, so let's approximate
        // by reading the page title or storing it locally
        setEventCtx({
          id: activeEventId,
          title: "", // Will use breadcrumb data
          slug: "",
          guestCount: data.data?.length || 0,
          status: "",
        });
      })
      .catch(() => {
        // Still show navigation even without context data
        setEventCtx({
          id: activeEventId,
          title: "",
          slug: "",
          guestCount: 0,
          status: "",
        });
      });
  }, [activeEventId, eventCtx?.id]);

  const mainNavItems = [
    { href: "/dashboard", label: t.nav.dashboard as string, icon: LayoutDashboard },
    { href: "/events", label: t.nav.events as string, icon: CalendarDays },
    { href: "/plans", label: t.nav.plans as string, icon: CreditCard },
  ];

  // Sub-items grouped: card pages + separator + tools
  interface SubItem {
    key: string;
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    separator?: boolean;
  }

  const eventSubItems: SubItem[] = activeEventId
    ? [
        // Card pages (map to edit steps)
        { key: "accueil", href: `/events/${activeEventId}/edit?step=0`, label: "Accueil", icon: Home },
        { key: "evenement", href: `/events/${activeEventId}/edit?step=1`, label: "L'événement", icon: ClipboardList },
        { key: "infos", href: `/events/${activeEventId}/edit?step=2`, label: "Infos & Moments", icon: MapPin },
        { key: "confirmation", href: `/events/${activeEventId}/edit?step=3`, label: "Confirmation", icon: CheckCircle2 },
        // Separator + tools
        { key: "sep", href: "", label: "", icon: LayoutDashboard, separator: true },
        { key: "overview", href: `/events/${activeEventId}`, label: "Vue d'ensemble", icon: LayoutDashboard },
        { key: "guests", href: `/events/${activeEventId}/guests`, label: `Invités${eventCtx?.guestCount ? ` (${eventCtx.guestCount})` : ""}`, icon: Users },
        { key: "scanner", href: `/events/${activeEventId}/scanner`, label: "Scanner QR", icon: ScanLine },
        { key: "controllers", href: `/events/${activeEventId}/settings#controllers`, label: "Contrôleurs", icon: Shield },
        { key: "settings", href: `/events/${activeEventId}/settings`, label: "Paramètres", icon: Settings },
      ]
    : [];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/events" && !activeEventId) return pathname === "/events";
    if (href === "/events" && activeEventId) return true;
    return pathname === href;
  }

  function isSubActive(key: string) {
    // For card pages, check both the edit path and the step parameter
    if (["accueil", "evenement", "infos", "confirmation"].includes(key)) {
      if (activeSubPage !== "edit") return false;
      const stepMap: Record<string, string> = { accueil: "0", evenement: "1", infos: "2", confirmation: "3" };
      const step = searchParams.get("step");
      if (step === stepMap[key]) return true;
      // Default to accueil if no step param and we're on edit
      if (!step && key === "accueil") return true;
      return false;
    }
    return activeSubPage === key || (key === "overview" && activeSubPage === "overview");
  }

  function handleCopyLink() {
    if (!eventCtx) return;
    const url = `${window.location.origin}/${eventCtx.slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`flex h-14 items-center border-b border-gray-100 dark:border-gray-800 px-4 ${collapsed ? "justify-center" : "gap-2 px-5"}`}>
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7A3A50] to-[#C48B90] flex-shrink-0">
            <span className="text-sm font-bold text-white">E</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Event<span className="text-[#7A3A50] dark:text-[#C48B90]">Flow</span>
            </span>
          )}
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const isEventsWithContext = item.href === "/events" && activeEventId;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active && !isEventsWithContext
                    ? "bg-[#7A3A50] text-white shadow-lg shadow-[#7A3A50]/20"
                    : active && isEventsWithContext
                    ? "bg-[#7A3A50]/10 dark:bg-[#7A3A50]/20 text-[#7A3A50] dark:text-[#C48B90] font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>

              {/* ── Contextual Event Sub-Navigation ── */}
              {isEventsWithContext && !collapsed && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#7A3A50]/20 dark:border-[#C48B90]/20 pl-3">
                  {eventSubItems.map((sub) => {
                    if (sub.separator) {
                      return (
                        <div key={sub.key} className="my-1.5 h-px bg-gray-100 dark:bg-gray-800" />
                      );
                    }

                    const SubIcon = sub.icon;
                    const subActive = isSubActive(sub.key);

                    return (
                      <Link
                        key={sub.key}
                        href={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all ${
                          subActive
                            ? "bg-[#7A3A50] text-white shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <SubIcon className="h-4 w-4 flex-shrink-0" />
                        <span>{sub.label}</span>
                      </Link>
                    );
                  })}

                  {/* Preview link */}
                  {eventCtx?.slug && (
                    <div className="pt-1 flex gap-1">
                      <Link
                        href={`/${eventCtx.slug}`}
                        target="_blank"
                        className="flex flex-1 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#7A3A50] dark:text-[#C48B90] hover:bg-[#7A3A50]/5 dark:hover:bg-[#7A3A50]/10 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Prévisualiser
                        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                      </Link>
                      <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="Copier le lien"
                      >
                        {linkCopied ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsed mode: show dot indicator for active sub-page */}
              {isEventsWithContext && collapsed && (
                <div className="flex justify-center mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#7A3A50] dark:bg-[#C48B90]" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 ${collapsed ? "justify-center" : ""}`}
          title={theme === "light" ? (t.user_menu.theme_dark as string) : (t.user_menu.theme_light as string)}
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5 flex-shrink-0" />
          ) : (
            <Sun className="h-5 w-5 flex-shrink-0" />
          )}
          {!collapsed && (
            <span className="text-[13px]">
              {theme === "light" ? t.user_menu.theme_dark as string : t.user_menu.theme_light as string}
            </span>
          )}
        </button>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 ${collapsed ? "justify-center" : ""}`}
            title={t.user_menu.language as string}
          >
            <Languages className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-[13px]">{LOCALES[locale].flag} {LOCALES[locale].label}</span>
                <ChevronDown className={`h-4 w-4 transition ${langMenuOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {langMenuOpen && (
            <div className={`absolute bottom-full mb-1 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden z-50 ${collapsed ? "left-full ml-2" : "left-0 right-0"}`}>
              {(Object.entries(LOCALES) as [Locale, { label: string; flag: string }][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setLocale(key); setLangMenuOpen(false); }}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    locale === key ? "bg-[#7A3A50]/5 text-[#7A3A50] dark:text-[#C48B90] font-medium" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span>{val.flag}</span>
                  <span>{val.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-gray-100 dark:hover:bg-gray-800 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7A3A50]/10 dark:bg-[#7A3A50]/30 text-sm font-bold text-[#7A3A50] dark:text-[#C48B90] flex-shrink-0">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </p>
                <p className="truncate text-[11px] text-gray-400 dark:text-gray-500">
                  {user.plan || "FREE"}
                </p>
              </div>
            )}
            {!collapsed && (
              <ChevronDown className={`h-4 w-4 text-gray-400 transition ${userMenuOpen ? "rotate-180" : ""}`} />
            )}
          </button>

          {userMenuOpen && (
            <div className={`absolute bottom-full mb-1 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden z-50 ${collapsed ? "left-full ml-2 w-48" : "left-0 right-0"}`}>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.user_menu.logout as string}</span>
              </button>
            </div>
          )}
        </div>

        {/* Collapse button (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-gray-900 shadow-lg border border-gray-100 dark:border-gray-800 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-gray-950 shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
