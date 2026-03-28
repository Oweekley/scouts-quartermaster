"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  PackageOpen,
  Package,
  QrCode,
  RotateCcw,
  ScanLine,
  TriangleAlert,
  Users,
  Wrench,
  Zap,
  Bell,
  FileDown,
  Layers,
  History,
} from "lucide-react";
import clsx from "clsx";
import { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";

type SessionUser = {
  name: string;
  role: Role;
};

type MobileNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  hidden?: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

function NavItem({
  href,
  label,
  icon,
  collapsed = false,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const showBadge = (badge ?? 0) > 0;
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors",
        active ? "text-white" : "text-white hover:bg-white/10",
      )}
      title={label}
      style={
        active
          ? { backgroundColor: "rgb(76, 17, 116)", color: "#fff" }
          : { color: "#fff" }
      }
    >
      <span className="relative">
        {icon}
        {showBadge ? (
          <span
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[rgb(89,23,133)]"
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span
        className={clsx(
          "truncate transition-all",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function AppShell({
  user,
  children,
  logoutAction,
}: {
  user: SessionUser;
  children: React.ReactNode;
  logoutAction: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerQuery = pathname.startsWith("/equipment") ? (searchParams.get("q") ?? "") : "";
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [alertTotal, setAlertTotal] = useState(0);
  const lastAlertTotalRef = useRef(0);

  const activeTitle = useMemo(() => {
    const map: { href: string; label: string }[] = [
      { href: "/home", label: "Quick actions" },
      { href: "/today", label: "Today" },
      { href: "/scan", label: "Scan" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/equipment", label: "Equipment" },
      { href: "/stock", label: "Stock" },
      { href: "/qr", label: "QR lookup" },
      { href: "/checkouts", label: "Checkouts" },
      { href: "/bundles", label: "Bundles" },
      { href: "/returns", label: "Returns" },
      { href: "/maintenance", label: "Maintenance" },
      { href: "/locations", label: "Locations" },
      { href: "/sections", label: "Sections" },
      { href: "/admin/users", label: "Users" },
      { href: "/reminders", label: "Reminders" },
      { href: "/admin/csv", label: "CSV import/export" },
      { href: "/admin/equipment-types", label: "Equipment types" },
      { href: "/audit", label: "Audit log" },
    ];
    const found = map.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
    return found?.label ?? "Scout Quartermaster";
  }, [pathname]);

  const mobileNavItems = useMemo(() => {
    const items: MobileNavItem[] = [
      { href: "/home", label: "Home", icon: <Zap className="h-5 w-5" /> },
      { href: "/equipment", label: "Kit", icon: <Package className="h-5 w-5" /> },
      { href: "/scan", label: "Scan", icon: <ScanLine className="h-5 w-5" /> },
      { href: "/checkouts", label: "Out", icon: <ClipboardList className="h-5 w-5" /> },
      { href: "/today", label: "Today", icon: <CalendarDays className="h-5 w-5" /> },
    ];
    return items;
  }, []);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase?.();
      return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "s") {
        router.push("/scan");
        return;
      }
      if (e.key === "h") {
        router.push("/home");
        return;
      }
      if (e.key === "e") {
        router.push("/equipment");
        return;
      }
      if (e.key === "n") {
        if (user.role === Role.ADMIN || user.role === Role.QUARTERMASTER) router.push("/equipment/new");
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, user.role]);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch("/api/alerts/summary", { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<{ total: number }>;
        const total = typeof data.total === "number" ? data.total : 0;
        if (stopped) return;
        setAlertTotal(total);

        const prev = lastAlertTotalRef.current;
        lastAlertTotalRef.current = total;
        if (total > 0 && prev === 0) {
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              // Best-effort: browsers may throttle or block.
              new Notification("Scout Quartermaster", { body: "You have items needing attention in Today." });
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    void poll();
    const t = window.setInterval(poll, 5 * 60 * 1000);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div
        className={clsx(
          "grid w-full grid-cols-1",
          collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[280px_1fr]",
        )}
      >
        <aside
          className="border-b border-slate-200 md:min-h-screen md:border-b-0 md:border-r md:border-r-black/10"
          style={{
            backgroundColor: "rgb(89, 23, 133)",
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0) 140px)",
          }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-white/10 text-white font-semibold">
                SQ
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">
                    Scout Quartermaster
                  </div>
                  <div className="mt-0.5 text-xs text-white/90 truncate">
                    {user.name} · {user.role}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className={clsx(
                "w-full rounded-md px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10",
              )}
            >
              {collapsed ? "→" : "← Hide"}
            </button>
          </div>

          <nav className="px-3 pb-4 space-y-1">
            <div
              className={clsx(
                "px-3 pb-2 text-[11px] uppercase tracking-wide text-white/80",
                collapsed && "hidden",
              )}
            >
              Kit
            </div>
            <NavItem collapsed={collapsed} href="/home" label="Quick actions" icon={<Zap className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/today" label="Today" icon={<CalendarDays className="h-4 w-4" />} badge={alertTotal} />
            <NavItem collapsed={collapsed} href="/equipment" label="Equipment" icon={<Package className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/stock" label="Stock" icon={<TriangleAlert className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/store-cupboard" label="Store cupboard" icon={<PackageOpen className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/scan" label="Scan" icon={<ScanLine className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/qr" label="QR lookup" icon={<QrCode className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/checkouts" label="Checkouts" icon={<ClipboardList className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/bundles" label="Bundles" icon={<PackageOpen className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/returns" label="Returns" icon={<RotateCcw className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/maintenance" label="Maintenance" icon={<Wrench className="h-4 w-4" />} />
            <div
              className={clsx(
                "mt-3 px-3 pb-2 text-[11px] uppercase tracking-wide text-white/80",
                collapsed && "hidden",
              )}
            >
              Admin
            </div>
            <NavItem collapsed={collapsed} href="/dashboard" label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/locations" label="Locations" icon={<MapPin className="h-4 w-4" />} />
            <NavItem collapsed={collapsed} href="/sections" label="Sections" icon={<Users className="h-4 w-4" />} />
            {user.role === Role.ADMIN || user.role === Role.QUARTERMASTER ? (
              <NavItem collapsed={collapsed} href="/admin/csv" label="CSV import/export" icon={<FileDown className="h-4 w-4" />} />
            ) : null}
            {user.role === Role.ADMIN || user.role === Role.QUARTERMASTER ? (
              <NavItem collapsed={collapsed} href="/admin/equipment-types" label="Equipment types" icon={<Layers className="h-4 w-4" />} />
            ) : null}
            {user.role === Role.ADMIN || user.role === Role.QUARTERMASTER ? (
              <NavItem collapsed={collapsed} href="/audit" label="Audit log" icon={<History className="h-4 w-4" />} />
            ) : null}
            {user.role === Role.ADMIN ? (
              <>
                <NavItem collapsed={collapsed} href="/admin/users" label="Users" icon={<Users className="h-4 w-4" />} />
                <NavItem collapsed={collapsed} href="/reminders" label="Reminders" icon={<Bell className="h-4 w-4" />} />
              </>
            ) : null}
          </nav>

          <div className="px-4 pb-6">
            <form action={logoutAction}>
              <Button
                variant="secondary"
                className="w-full justify-center border-white/30 bg-white text-[rgb(89,23,133)] hover:bg-white/90"
                type="submit"
              >
                {collapsed ? initials(user.name) : "Sign out"}
              </Button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-[color:var(--border)] bg-[color:var(--topbar)]">
            <div className="flex items-center justify-between gap-3 px-4 py-2 md:px-8">
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2">
                  <div className="rounded-t-md border border-[color:var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm">
                    {activeTitle}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-end gap-2">
                <form action="/equipment" className="hidden md:block w-full max-w-lg">
                  <input
                    name="q"
                    placeholder="Start typing to filter…"
                    defaultValue={headerQuery}
                    ref={searchInputRef}
                    className="h-9 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-offset-2"
                  />
                </form>
                {user.role === Role.ADMIN || user.role === Role.QUARTERMASTER ? (
                  <Link
                    href="/equipment/new"
                    className="inline-flex items-center justify-center rounded-md bg-[color:var(--primary)] px-3 py-2 text-sm font-medium text-white hover:brightness-95"
                  >
                    + Add item
                  </Link>
                ) : null}
              </div>
            </div>
          </header>

          <main className="p-5 pb-24 md:p-8 md:pb-8">{children}</main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[color:var(--border)] bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const showBadge = item.href === "/today" && alertTotal > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs font-medium",
                  active ? "text-[color:var(--primary)]" : "text-slate-700",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className={clsx("relative grid h-9 w-9 place-items-center rounded-lg", active ? "bg-[color:var(--primary)]/10" : "")}>
                  {item.icon}
                  {showBadge ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
                  ) : null}
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
