"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { NavigationProgress } from "@/components/navigation-progress";
import { Icon } from "@/components/ui/icon";

type AppShellProps = { userName: string; userEmail: string; children: ReactNode };

const NAV_ITEMS = [
  { href: "/monthly-income", labelKey: "monthlyIncome", icon: "trendingUp" },
  { href: "/monthly-expenses", labelKey: "monthlyExpenses", icon: "receipt" },
  { href: "/debts", labelKey: "debts", icon: "landmark" },
  { href: "/travels", labelKey: "travels", icon: "plane" },
  { href: "/categories", labelKey: "categories", icon: "tags" },
] as const;

export function AppShell({ userName, userEmail, children }: AppShellProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <nav aria-label={t("main")} className="flex flex-1 flex-col">
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
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-ink-line pt-4">
        <p className="truncate px-3 text-sm font-medium text-white">{userName}</p>
        <p className="truncate px-3 text-xs text-ink-muted">{userEmail}</p>
        <LanguageSwitcher className="mt-3 text-ink-muted" />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-field px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-ink-soft hover:text-white"
        >
          <Icon name="logout" />
          {t("logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-2.5 text-white lg:hidden">
        <Link href="/" className="font-display text-lg font-semibold">
          {tCommon("appName")}
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
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
          {tCommon("appName")}
        </Link>
        {nav}
      </aside>

      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
    </div>
  );
}
