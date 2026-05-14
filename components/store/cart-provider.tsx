// components/store/cart-provider.tsx
// Client-side cart context — manages cart state, optimistic updates, and drawer open state

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { CartWithItems } from "@/lib/cart";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface AddItemPayload {
  productId: string;
  variantId?: string;
  quantity?: number;
  productName?: string; // used for toast message
  lensConfig?: any;
}


interface CartContextValue {
  cart: CartWithItems | null;
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  itemCount: number;
  subtotal: number;
  addItem: (payload: AddItemPayload) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getItemPrice(item: CartWithItems["items"][number]): number {
  if (item.variant?.priceOverride) {
    return Number(item.variant.priceOverride);
  }
  
  if (item.product.flashSale) {
    const now = new Date();
    const startTime = new Date(item.product.flashSale.startTime);
    const endTime = new Date(item.product.flashSale.endTime);
    if (now >= startTime && now <= endTime) {
      return Number(item.product.flashSale.salePrice);
    }
  }

  return Number(item.product.price);
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export default function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const hasMerged = useRef(false);

  // ── Fetch cart on mount ──────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data: CartWithItems = await res.json() as CartWithItems;
      setCart(data);
    } catch (error: unknown) {
      console.error("[CartProvider] fetchCart:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  // ── Merge guest cart on login ────────────────────────────────────────────
  useEffect(() => {
    if (hasMerged.current) return;
    const guestSessionId =
      typeof document !== "undefined"
        ? document.cookie
            .split("; ")
            .find((c) => c.startsWith("miduka_session_id="))
            ?.split("=")[1]
        : undefined;

    if (guestSessionId) {
      hasMerged.current = true;
      fetch("/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestSessionId }),
      })
        .then(() => fetchCart())
        .catch(() => {
          /* silent — merge is best-effort */
        });
    }
  }, [fetchCart]);

  // ── Derived values ───────────────────────────────────────────────────────
  const itemCount = useMemo(
    () => (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      (cart?.items ?? []).reduce(
        (sum, item) => sum + getItemPrice(item) * item.quantity,
        0
      ),
    [cart]
  );

  // ── Mutations ────────────────────────────────────────────────────────────

  const addItem = useCallback(
    async ({ productId, variantId, quantity = 1, productName, lensConfig }: AddItemPayload) => {
      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, variantId, quantity, lensConfig }),
        });


        if (!res.ok) {
          const err = await res.json() as { error?: string };
          toast.error(err.error ?? "Could not add item to cart");
          return;
        }

        const updated: CartWithItems = await res.json() as CartWithItems;
        setCart(updated);
        toast.success(
          productName ? `"${productName}" added to cart` : "Added to cart"
        );
      } catch (error: unknown) {
        console.error("[CartProvider] addItem:", error);
        toast.error("Could not add item to cart");
      }
    },
    []
  );

  const removeItem = useCallback(async (itemId: string) => {
    // Optimistic update
    setCart((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((i) => i.id !== itemId) };
    });

    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch (error: unknown) {
      console.error("[CartProvider] removeItem:", error);
      toast.error("Could not remove item");
      void fetchCart(); // revert
    }
  }, [fetchCart]);

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      // Optimistic update
      setCart((prev) => {
        if (!prev) return prev;
        if (quantity === 0) {
          return { ...prev, items: prev.items.filter((i) => i.id !== itemId) };
        }
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        };
      });

      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
        if (!res.ok) throw new Error("Update failed");
      } catch (error: unknown) {
        console.error("[CartProvider] updateQuantity:", error);
        toast.error("Could not update quantity");
        void fetchCart(); // revert
      }
    },
    [fetchCart]
  );

  const clearCart = useCallback(async () => {
    try {
      await fetch("/api/cart", { method: "DELETE" });
      setCart((prev) => (prev ? { ...prev, items: [] } : prev));
    } catch (error: unknown) {
      console.error("[CartProvider] clearCart:", error);
    }
  }, []);

  // ── Context value ────────────────────────────────────────────────────────
  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      isOpen,
      setIsOpen,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [cart, isLoading, isOpen, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
