"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, type ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/revenue", label: "Revenue Recording", icon: "payments" },
  { href: "/commission", label: "Daily Commission", icon: "fact_check" },
  { href: "/staff", label: "Staff Performance", icon: "groups" },
  { href: "/reports", label: "Reports", icon: "summarize" },
  { href: "/settings", label: "Settings & Expenses", icon: "settings" },
];

export function AppShell({
  children,
  userName,
  userRole,
  businessName,
}: {
  children: ReactNode;
  userName: string;
  userRole: string;
  businessName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/revenue?q=${encodeURIComponent(searchValue.trim())}`);
    }
  }

  const nav = (
    <>
      <div className="p-gutter border-b border-outline-variant/30 flex items-center gap-3">
        <Image src="/brand/logo.png" alt={businessName} width={40} height={40} className="rounded-lg shrink-0" />
        <div className="min-w-0">
          <h1 className="text-headline-md font-headline-md font-bold text-primary truncate">{businessName}</h1>
          <p className="text-label-caps font-label-caps text-on-surface-variant truncate">Management System</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-gutter flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                active
                  ? "text-primary font-bold bg-secondary-container"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined" data-weight={active ? "fill" : undefined}>
                {item.icon}
              </span>
              <span className="text-label-caps font-label-caps">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-gutter mt-auto flex flex-col gap-4 border-t border-outline-variant/30">
        <Link
          href="/revenue?action=new"
          onClick={() => setMobileOpen(false)}
          className="w-full py-3 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Record Wash
        </Link>
        <div className="flex flex-col gap-1 mt-2">
          <div className="px-2 py-1 text-label-caps font-label-caps text-on-surface-variant">
            {userName} · {userRole === "OWNER" ? "Owner" : "Manager"}
          </div>
          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 p-2 text-on-surface-variant hover:text-primary transition-colors rounded-md text-label-caps font-label-caps"
          >
            <span className="material-symbols-outlined text-[18px]">account_circle</span>
            My Profile
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 p-2 text-on-surface-variant hover:text-primary transition-colors rounded-md text-label-caps font-label-caps text-left"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex max-w-container-max mx-auto relative">
      {/* Desktop sidebar */}
      <aside className="w-sidebar-width h-screen fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant shadow-sm z-50 flex-col hidden md:flex">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-sidebar-width bg-surface-container-lowest shadow-level-2 flex flex-col">
            {nav}
          </aside>
        </div>
      )}

      <main className="flex-1 md:ml-sidebar-width min-w-0">
        <header className="fixed top-0 right-0 w-full md:w-[calc(100%-260px)] h-16 bg-surface-bright/80 backdrop-blur-md border-b border-outline-variant shadow-sm z-40 flex justify-between items-center px-gutter">
          <button
            className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <form onSubmit={submitSearch} className="flex-1 max-w-md hidden sm:flex">
            <div className="relative w-full group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary text-[20px]">
                search
              </span>
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-data-tabular font-data-tabular focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Search by vehicle number..."
                type="text"
              />
            </div>
          </form>

          <div className="flex items-center gap-4 ml-auto">
            <Link
              href="/revenue?action=new"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-full text-label-caps font-label-caps font-medium hover:bg-primary-container/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Entry
            </Link>
            <Link
              href="/profile"
              title="My Profile"
              className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-primary/20 transition-all"
            >
              {userName.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>

        <div className="pt-[88px] px-4 md:px-gutter pb-gutter">{children}</div>
      </main>
    </div>
  );
}
