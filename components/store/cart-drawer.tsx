// components/store/cart-drawer.tsx
// Slide-in cart drawer triggered by the header cart icon

"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/components/store/cart-provider";
import { formatCurrency } from "@/lib/utils";
import type { CartWithItems } from "@/lib/cart";

// ─── CART ITEM ROW ───────────────────────────────────────────────────────────

function CartItemRow({ item }: { item: CartWithItems["items"][number] }) {
  const { updateQuantity, removeItem } = useCart();

  const price = item.variant?.priceOverride
    ? Number(item.variant.priceOverride)
    : Number(item.product.price);

  const variantLabel = [item.variant?.colour, item.variant?.size, item.variant?.material]
    .filter(Boolean)
    .join(" / ");

  const primaryImage = item.product.images[0]?.url ?? null;
  const blurDataUrl = item.product.images[0]?.blurDataUrl ?? null;

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Thumbnail */}
      <div className="relative h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden bg-muted border border-border">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="64px"
            {...(blurDataUrl ? { placeholder: "blur", blurDataURL: blurDataUrl } : {})}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {item.product.name}
        </p>
        {variantLabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{variantLabel}</p>
        )}
        {item.lensConfigJson && (() => {
          try {
            const config = JSON.parse(item.lensConfigJson);
            return (
              <p className="text-[10px] text-primary/80 font-medium mt-1 leading-relaxed">
                {config.lensType} · {config.lensCoating}
                {config.prescriptionSource === "later" && " · Rx Later"}
              </p>
            );
          } catch {
            return null;
          }
        })()}
        <p className="text-sm font-semibold mt-1 text-primary">
          {formatCurrency(price * item.quantity)}
        </p>


        {/* Quantity stepper */}
        <div className="flex items-center gap-1.5 mt-2">
          <button
            aria-label="Decrease quantity"
            onClick={() => void updateQuantity(item.id, item.quantity - 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            disabled={item.quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <button
            aria-label="Increase quantity"
            onClick={() => void updateQuantity(item.id, item.quantity + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Remove */}
      <button
        aria-label="Remove item"
        onClick={() => void removeItem(item.id)}
        className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── CART DRAWER ─────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const { cart, isOpen, setIsOpen, itemCount, subtotal } = useCart();

  const items = cart?.items ?? [];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Cart
            {itemCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add some products to get started
              </p>
            </div>
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center h-8 gap-1.5 px-2.5 rounded-2xl border border-border bg-background hover:bg-muted text-sm font-medium transition-all"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6">
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <CartItemRow key={item.id} item={item} />
                ))}
              </div>
            </ScrollArea>

            {/* Footer summary */}
            <div className="border-t border-border px-6 py-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping calculated at checkout
              </p>
              <Separator />
              <div className="grid gap-2">
                <Link
                  href="/checkout"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full items-center justify-center h-9 gap-1.5 px-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/80 text-sm font-medium transition-all"
                >
                  Proceed to Checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex w-full items-center justify-center h-8 gap-1.5 px-2.5 rounded-2xl border border-border bg-background hover:bg-muted text-sm font-medium transition-all"
                >
                  View Full Cart
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
