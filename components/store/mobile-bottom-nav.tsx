// components/store/mobile-bottom-nav.tsx
// Fixed bottom navigation bar for mobile — 5 tabs

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2X2, Gift, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home, badge: undefined },
  { href: "/products", label: "Products", icon: Search, badge: undefined },
  { href: "/categories", label: "Categories", icon: Grid2X2, badge: undefined },
  { href: "/gift-cards", label: "Gift Cards", icon: Gift, badge: undefined },
  { href: "/account", label: "Account", icon: User, badge: undefined },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* A11Y: Ensured aria-label on nav */}
      <nav
        aria-label="Mobile bottom navigation"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-card border-t border-border shadow-lg"
    >
      <div className="flex items-stretch justify-around h-16">
        {TABS.map(({ href, label, icon: Icon, badge }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              id={`mobile-nav-${label.toLowerCase()}`}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
