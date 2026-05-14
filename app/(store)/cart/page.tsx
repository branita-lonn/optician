// app/(store)/cart/page.tsx
// Full cart page — item list with quantity controls and order summary panel

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Minus, Plus, Trash2, Tag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/store/cart-provider";
import { formatCurrency } from "@/lib/utils";
import type { CartWithItems } from "@/lib/cart";
import { toast } from "sonner";

function CartItemRow({ item }: { item: CartWithItems["items"][number] }) {
  const { updateQuantity, removeItem } = useCart();

  const price = item.variant?.priceOverride
    ? Number(item.variant.priceOverride)
    : Number(item.product.price);

  const variantLabel = [
    item.variant?.colour,
    item.variant?.size,
    item.variant?.material,
  ]
    .filter(Boolean)
    .join(" / ");

  const primaryImage = item.product.images[0]?.url ?? null;

  return (
    <div className="flex gap-4 py-4">
      {/* Thumbnail */}
      <div className="relative h-24 w-24 flex-shrink-0 rounded-2xl overflow-hidden bg-muted border border-border">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <Link
          href={`/products/${item.product.slug}`}
          className="font-semibold hover:text-primary transition-colors line-clamp-2 leading-snug"
        >
          {item.product.name}
        </Link>
        {variantLabel && (
          <p className="text-sm text-muted-foreground">{variantLabel}</p>
        )}
        {item.lensConfigJson && (() => {
          try {
            const config = JSON.parse(item.lensConfigJson);
            return (
              <p className="text-xs text-primary/80 font-medium mt-1 leading-relaxed">
                {config.lensType} · {config.lensCoating}
                {config.prescriptionSource === "later" && " · Rx to be provided later"}
              </p>
            );
          } catch {
            return null;
          }
        })()}

        <p className="text-sm font-bold text-primary mt-auto">
          {formatCurrency(price)}
        </p>
      </div>

      {/* Quantity + remove */}
      <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
        <button
          aria-label="Remove item"
          onClick={() => void removeItem(item.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <div className="flex items-center rounded-2xl border border-border overflow-hidden">
          <button
            aria-label="Decrease quantity"
            onClick={() => void updateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="h-11 w-11 flex items-center justify-center text-sm hover:bg-muted transition-colors disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <button
            aria-label="Increase quantity"
            onClick={() => void updateQuantity(item.id, item.quantity + 1)}
            className="h-11 w-11 flex items-center justify-center text-sm hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm font-semibold">
          {formatCurrency(price * item.quantity)}
        </p>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { cart, isLoading, subtotal } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const total = subtotal - discount;

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          subtotal,
        }),
      });
      const data = (await res.json()) as {
        discount?: number;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error ?? "Invalid coupon code");
        return;
      }

      setDiscount(data.discount ?? 0);
      setAppliedCoupon(couponCode.trim().toUpperCase());
      toast.success(data.message ?? "Coupon applied!");
    } catch {
      toast.error("Could not apply coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="text-muted-foreground mt-2">
            Looks like you haven&apos;t added anything yet.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-9 gap-1.5 px-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/80 text-sm font-medium transition-all"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">
        Your Cart ({items.length} item{items.length !== 1 ? "s" : ""})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Item list */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-border bg-card p-6 divide-y divide-border">
            {items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl border border-border bg-card p-6 space-y-4 sticky top-24">
            <h2 className="text-lg font-bold">Order Summary</h2>
            <Separator />

            {/* Coupon input */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Tag className="h-4 w-4" /> Coupon Code
              </p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                  <span className="text-sm font-mono text-emerald-700 dark:text-emerald-400">
                    {appliedCoupon}
                  </span>
                  <button
                    onClick={() => {
                      setDiscount(0);
                      setAppliedCoupon(null);
                      setCouponCode("");
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="rounded-xl uppercase"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void applyCoupon();
                    }}
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl flex-shrink-0"
                    disabled={couponLoading || !couponCode.trim()}
                    onClick={() => void applyCoupon()}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount ({appliedCoupon})</span>
                  <span>−{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">
                  Calculated at checkout
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>

            <Link
              href="/checkout"
              className="inline-flex w-full items-center justify-center h-9 gap-1.5 px-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/80 text-sm font-medium transition-all"
            >
              Proceed to Checkout
              <ChevronRight className="h-4 w-4" />
            </Link>

            <Link
              href="/"
              className="inline-flex w-full items-center justify-center h-8 gap-1.5 px-2.5 rounded-2xl border border-border bg-background hover:bg-muted text-sm font-medium transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
