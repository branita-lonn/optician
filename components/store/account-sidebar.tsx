// components/store/account-sidebar.tsx
// Account navigation sidebar for logged-in customers

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Package, 
  Heart, 
  MapPin, 
  User, 
  ChevronRight,
  Coins,
  Menu,
  X,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  {
    title: "My Orders",
    href: "/account/orders",
    icon: Package,
  },
  {
    title: "My Appointments",
    href: "/account/appointments",
    icon: Calendar,
  },
  {
    title: "Wishlist",
    href: "/account/wishlist",
    icon: Heart,
  },
  {
    title: "Loyalty Points",
    href: "/account/loyalty",
    icon: Coins,
  },
  {
    title: "Addresses",
    href: "/account/addresses",
    icon: MapPin,
  },
  {
    title: "Profile Settings",
    href: "/account/profile",
    icon: User,
  },
];

interface AccountSidebarProps {
  customer: {
    name: string | null;
    email: string | null;
  };
}

export default function AccountSidebar({ customer }: AccountSidebarProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Mobile Overlay */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      <div className={cn(
        "flex flex-col bg-card border rounded-3xl overflow-hidden shadow-sm transition-all duration-300 z-50",
        isExpanded ? "w-64 fixed lg:relative lg:w-auto h-[80vh] lg:h-full" : "w-16 lg:w-auto h-[80vh] lg:h-full sticky top-24"
      )}>
        {/* Toggle Button for Mobile */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden w-full flex items-center justify-center h-12 border-b bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Customer Info Header */}
        <div className={cn("p-4 border-b bg-muted/30 flex items-center gap-3", !isExpanded && "lg:p-6 justify-center lg:justify-start")}>
          <div className="w-8 h-8 lg:w-10 lg:h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {customer.name?.[0]?.toUpperCase() || customer.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className={cn("flex flex-col min-w-0", !isExpanded && "hidden lg:flex")}>
            <p className="font-semibold truncate text-sm">
              {customer.name || "Customer"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {customer.email}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        {/* A11Y: Added aria-label to nav */}
        <nav aria-label="Account navigation" className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsExpanded(false)}
                    className={cn(
                      "flex items-center px-3 lg:px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 group relative",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground",
                      !isExpanded && "justify-center lg:justify-between"
                    )}
                    title={!isExpanded ? item.title : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "w-5 h-5 lg:w-4 lg:h-4 shrink-0 transition-colors",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                      )} />
                      <span className={cn(!isExpanded && "hidden lg:inline")}>{item.title}</span>
                    </div>
                    {isExpanded || true ? (
                      <ChevronRight className={cn(
                        "w-3 h-3 shrink-0 transition-transform duration-200 hidden lg:block",
                        isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
                        isExpanded && "block"
                      )} />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
