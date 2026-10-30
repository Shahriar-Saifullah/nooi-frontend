"use client";

/**
 * AdminShell — the admin console frame
 * ----------------------------------------------------------------------------
 * Left sidebar, grouped nav, content area on #E9EDEC. Deliberately unlike the
 * shopper app's floating header: this is a back-office tool used for an hour at
 * a time with many screens, not a storefront.
 *
 * It also guards the route. requireAdmin protects the API, but without a client
 * check a non-admin sees the whole console chrome and a column of failed
 * requests, which reads as broken rather than forbidden.
 *
 * Nav items for screens that don't exist yet are shown disabled rather than
 * hidden — an admin should be able to see the shape of the tool, and a nav that
 * grows item by item as features land is harder to learn than one that is
 * honest about what's coming.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Store, PackageCheck, RotateCcw, ShoppingBag, XCircle,
  LifeBuoy, Users, Wallet, UsersRound, Settings, ScrollText, Loader2, ShieldAlert,
  LogOut,
  Box,
} from "lucide-react";

import { getCurrentUser, logout, type AuthUser } from "@/lib/api/auth";
import { getVendorQueue, getOpsCounts, type OpsCounts } from "@/lib/api/admin";
import NotificationBell from "@/components/NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Live badge count, set by the shell where it matters. */
  badge?: number;
  ready: boolean;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [ops, setOps] = useState<OpsCounts | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Admin logout error:", err);
    } finally {
      router.replace("/authpage/signin");
    }
  };

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(res => { if (!cancelled) setUser(res.success ? res.data.user : null); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  const role = (user as any)?.role;
  const isAdmin = role === "admin" || role === "super_admin";

  // The pending badge is the one number an admin wants without clicking.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    getVendorQueue({ tab: "pending", limit: 1 })
      .then(res => {
        if (!cancelled && res.success) setPendingCount(res.data.counts.pending);
      })
      .catch(() => {});
    getOpsCounts()
      .then(res => { if (!cancelled && res.success) setOps(res.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAdmin, pathname]);

  const groups: NavGroup[] = [
    {
      heading: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={17} />, ready: true },
      ],
    },
    {
      heading: "Approvals",
      items: [
        {
          label: "Vendor applications",
          href: "/admin/applications",
          icon: <Store size={17} />,
          badge: pendingCount ?? undefined,
          ready: true,
        },
        { label: "Listings", href: "/admin/listings", icon: <PackageCheck size={17} />, badge: ops?.listings || undefined, ready: true },
        { label: "3D models", href: "/admin/models", icon: <Box size={17} />, badge: ops?.models || undefined, ready: true },
      ],
    },
    {
      heading: "Operations",
      items: [
        { label: "Refunds", href: "/admin/refunds", icon: <RotateCcw size={17} />, ready: true },
        { label: "Orders", href: "/admin/orders", icon: <ShoppingBag size={17} />, ready: true },
        { label: "Cancellations", href: "/admin/cancellations", icon: <XCircle size={17} />, badge: ops?.cancellations || undefined, ready: true },
        { label: "Support", href: "/admin/support", icon: <LifeBuoy size={17} />, badge: ops?.support || undefined, ready: true },
      ],
    },
    {
      heading: "Directory",
      items: [
        { label: "Vendor directory", href: "/admin/vendors", icon: <Users size={17} />, ready: true },
        { label: "Payouts", href: "/admin/payouts", icon: <Wallet size={17} />, ready: true },
      ],
    },
    {
      heading: "Console",
      items: [
        { label: "Team", href: "/admin/team", icon: <UsersRound size={17} />, ready: true },
        { label: "Audit log", href: "/admin/audit", icon: <ScrollText size={17} />, ready: true },
        { label: "Settings", href: "/admin/settings", icon: <Settings size={17} />, ready: true },
      ],
    },
  ];

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E9EDEC]">
        <Loader2 className="h-6 w-6 animate-spin text-[#004643]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E9EDEC] px-5">
        <div className="max-w-[420px] rounded-2xl border border-[#D5DBDA] bg-white p-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFFAF9] text-[#812F28]">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <h1 className="text-[17px] font-medium text-[#101212]">Admin access required</h1>
          <p className="mt-2 text-[12.5px] text-[#646968]">
            {user
              ? "This account doesn't have admin permissions."
              : "Sign in with an admin account to continue."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={() => router.push(user ? "/dashboard" : "/authpage/signin?next=/admin")}
              className="rounded-full bg-[#004643] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[#003836]"
            >
              {user ? "Back to Nooi" : "Sign in"}
            </button>
            {user && (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full border border-[#D5DBDA] bg-white px-4 py-2 text-[12.5px] font-medium text-[#812F28] hover:bg-[#FFFAF9] disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E9EDEC]">
      {/* Mobile top bar */}
      <header className="flex h-14 items-center justify-between border-b border-[#D5DBDA] bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Image
            width={100}
            height={100}
            src="/assets/logo.png"
            alt="Nooi"
            className="h-auto w-[24px] object-contain"
          />
          <span className="font-inter text-[14px] font-bold text-[#111d27]">
            Admin
          </span>
        </div>
        <NotificationBell className="ms-auto me-2" buttonClassName="relative flex h-8 w-8 items-center justify-center rounded-md border border-[#D5DBDA] bg-[#F8FAF9] text-[#4B4F4F] hover:bg-[#F1F4F4]" />
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 rounded-md border border-[#D5DBDA] bg-[#F8FAF9] px-2.5 py-1 text-[11.5px] font-medium text-[#4B4F4F] transition-colors hover:border-[#812F28]/30 hover:bg-[#FFFAF9] hover:text-[#812F28] disabled:opacity-50"
          title="Log out"
        >
          <LogOut size={13} />
          <span>{loggingOut ? "Logging out..." : "Log out"}</span>
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-[232px] flex-col border-r border-[#D5DBDA] bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <Image
            width={100}
            height={100}
            src="/assets/logo.png"
            alt="Nooi"
            className="h-auto w-[28px] object-contain"
          />
          <span className="font-inter text-[15px] font-bold tracking-tight text-[#111d27]">
            Admin
          </span>
          <NotificationBell className="ms-auto" placement="below-start" buttonClassName="relative flex h-8 w-8 items-center justify-center rounded-md border border-[#D5DBDA] bg-[#F8FAF9] text-[#4B4F4F] hover:bg-[#F1F4F4]" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map(group => (
            <div key={group.heading} className="mb-4">
              <div className="px-2 pb-1.5 text-[10.5px] font-medium uppercase tracking-wide text-[#8E9493]">
                {group.heading}
              </div>
              {group.items.map(item => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));

                if (!item.ready) {
                  return (
                    <span
                      key={item.href}
                      title="Not built yet"
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] text-[#B3B9B9]"
                    >
                      {item.icon}
                      <span className="flex-1 truncate">{item.label}</span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] transition-colors ${
                      active
                        ? "bg-[#F3FEFD] font-medium text-[#004643]"
                        : "text-[#343837] hover:bg-[#F1F4F4]"
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-[#004643] px-1.5 py-px text-[10.5px] font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-[#E6EBEA] px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#004643] text-[12px] font-medium text-white">
                {(user?.full_name || user?.email || "?").trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <span className="block truncate text-[12px] font-medium text-[#101212]">
                  {user?.full_name || user?.email}
                </span>
                <span className="block text-[10.5px] text-[#8E9493]">
                  {role === "super_admin" ? "Super admin" : "Admin"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex shrink-0 items-center gap-1 rounded-md border border-[#D5DBDA] bg-[#F8FAF9] px-2 py-1 text-[11px] font-medium text-[#4B4F4F] transition-colors hover:border-[#812F28]/30 hover:bg-[#FFFAF9] hover:text-[#812F28] disabled:opacity-50"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={13} />
              <span>{loggingOut ? "..." : "Log out"}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="md:ml-[232px]">{children}</main>
    </div>
  );
}