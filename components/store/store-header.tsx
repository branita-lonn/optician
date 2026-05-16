// components/store/store-header.tsx
// Client Component — renders header with cart badge/drawer toggle using CartContext.
// Store name/logo are passed as props from StoreHeaderServer (RSC).

"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Heart, User, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoreSearchBar from "@/components/store/store-search-bar";
import { useCart } from "@/components/store/cart-provider";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StoreHeaderProps {
  storeName: string;
  logoUrl: string | null;
  logoBlurDataUrl?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export default function StoreHeader({ storeName, logoUrl, logoBlurDataUrl, user }: StoreHeaderProps) {
  const { itemCount, setIsOpen } = useCart();
  const pathname = usePathname();

  const NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/categories", label: "Categories" },
    { href: "/products", label: "Products" },
    { href: "/gift-cards", label: "Gift Cards" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-card border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center gap-3 relative">
        {/* Logo / Store Name */}
        <Link
          href="/"
          id="store-logo-link"
          className="flex items-center gap-2 flex-shrink-0 mr-2"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={storeName}
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
              priority
              {...(logoBlurDataUrl ? { placeholder: "blur", blurDataURL: logoBlurDataUrl } : {})}
            />
          ) : (
            <span className="text-xl font-extrabold tracking-tight text-primary">
              {storeName}
            </span>
          )}
        </Link>

        {/* Desktop Nav Links */}
        {/* A11Y: Added aria-label to nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 ml-4">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Search bar (desktop center + mobile icon) */}
        <StoreSearchBar />

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <ThemeToggle />

          <Link href="/account/wishlist" aria-label="Wishlist">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Heart className="h-5 w-5" />
            </Button>
          </Link>

          {/* User Account Dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full h-10 w-10 hover:bg-accent hover:text-accent-foreground shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" aria-label="Account menu">
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className={cn("bg-muted/30 flex items-center justify-start gap-3")}>
                      <div className="w-8 h-8 lg:w-10 lg:h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "My Account"}
                      </div>
                      <div className={cn("flex flex-col min-w-0")}>
                        <p className="font-semibold truncate text-sm">
                          {user.name || "user"}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {user.role === "STORE_OWNER" && (
                  <DropdownMenuItem render={<Link href="/dashboard" />}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Seller Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem render={<Link href="/account" />}>
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full h-10 w-10 hover:bg-accent hover:text-accent-foreground shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" aria-label="Account menu">
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="/auth/login" />}>
                  Log in
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/auth/register" />}>
                  Register
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Cart icon — opens drawer */}
          <Button
            id="header-cart-button"
            variant="ghost"
            size="icon"
            className="rounded-full relative"
            aria-label="Open cart"
            onClick={() => setIsOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header >
  );
}
