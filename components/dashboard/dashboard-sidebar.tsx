"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Tags, ShoppingCart, Users, BarChart, Settings, MessageSquare, Zap, Gift, Boxes, Truck, LayoutTemplate, Ticket, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/categories", label: "Categories", icon: Tags },
  { href: "/dashboard/coupons", label: "Coupons", icon: Ticket },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/prescriptions", label: "Prescriptions", icon: ClipboardList },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart },
  { href: "/dashboard/flash-sales", label: "Flash Sales", icon: Zap },
  { href: "/dashboard/bundles", label: "Bundle Deals", icon: Boxes },
  { href: "/dashboard/gift-cards", label: "Gift Cards", icon: Gift },
  { href: "/dashboard/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Store Settings", icon: Settings },
  { href: "/dashboard/hero", label: "Hero Carousel", icon: LayoutTemplate },
  { href: "/dashboard/delivery-zones", label: "Delivery Zones", icon: Truck },
];

export function DashboardSidebar({ storeName, onNavClick }: { storeName: string, onNavClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
        <span className="text-xl font-bold text-primary">{storeName}</span>
      </div>
      <div className="flex-1 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onNavClick?.()}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary border-r-4 border-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-border shrink-0">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View Store
        </Link>
      </div>
    </div>
  );
}
