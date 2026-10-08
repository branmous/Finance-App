"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

type AppShellProps = { userName: string; userEmail: string; children: ReactNode };

const NAV_ITEMS = [
  { href: "/monthly-income", label: "Monthly income", icon: "trendingUp" },
  { href: "/monthly-expenses", label: "Monthly expenses", icon: "receipt" },
  { href: "/debts", label: "Debts", icon: "landmark" },
  { href: "/travels", label: "Travels", icon: "plane" },
  { href: "/categories", label: "Categories", icon: "tags" },
] as const;

export function AppShell({ userName, userEmail, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <nav aria-label="Main" className="flex flex-1 flex-col">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-field px-3 text-sm font-medium transition-colors ${
                  active ? "bg-ink-soft text-white" : "text-ink-muted hover:bg-ink-soft hover:text-white"
                }`}
              >
                <Icon name={item.icon} className={active ? "text-saffron" : ""} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-ink-line pt-4">
        <p className="truncate px-3 text-sm font-medium text-white">{userName}</p>
        <p className="truncate px-3 text-xs text-ink-muted">{userEmail}</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-field px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-ink-soft hover:text-white"
        >
          <Icon name="logout" />
          Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-2.5 text-white lg:hidden">
        <Link href="/" className="font-display text-lg font-semibold">
          Finance App
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="rounded-field p-2 hover:bg-ink-soft"
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
      </header>

      <div
        id="mobile-menu"
        className={`${menuOpen ? "flex" : "hidden"} fixed inset-x-0 bottom-0 top-[3.25rem] z-20 flex-col bg-ink p-4 lg:hidden`}
      >
        {nav}
      </div>

      <aside className="hidden bg-ink p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/" className="mb-8 mt-2 px-3 font-display text-xl font-semibold text-white">
          Finance App
        </Link>
        {nav}
      </aside>

      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
    </div>
  );
}
