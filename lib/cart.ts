// lib/cart.ts
// Server-side cart utilities: getOrCreateCart and mergeGuestCartOnLogin

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── TYPE ─────────────────────────────────────────────────────────────────────

const cartWithItems = Prisma.validator<Prisma.CartDefaultArgs>()({
  include: {
    items: {
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            flashSale: true,
          },
        },
        variant: true,
      },
      orderBy: { createdAt: "asc" },
    },
  },
});

export type CartWithItems = Prisma.CartGetPayload<typeof cartWithItems>;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Finds an existing cart by customerId (logged-in) or sessionId (guest),
 * or creates a new one. Returns the cart with all items populated.
 */
export async function getOrCreateCart(
  customerId?: string,
  sessionId?: string
): Promise<CartWithItems> {
  // Prefer looking up by customerId for logged-in users
  if (customerId) {
    const existing = await prisma.cart.findUnique({
      where: { customerId },
      ...cartWithItems,
    });
    if (existing) return existing;

    // Check if user actually exists (to prevent FK constraint errors with stale sessions)
    const userExists = await prisma.user.findUnique({ where: { id: customerId } });
    if (userExists) {
      return prisma.cart.create({
        data: { customerId },
        ...cartWithItems,
      });
    } else {
      // Ignore customerId if the user record no longer exists
      customerId = undefined;
    }
  }

  // Fall back to sessionId for guests
  if (sessionId) {
    const existing = await prisma.cart.findFirst({
      where: { sessionId },
      ...cartWithItems,
    });
    if (existing) return existing;

    return prisma.cart.create({
      data: { sessionId },
      ...cartWithItems,
    });
  }

  // No identifier — create an anonymous cart (sessionId assigned by caller)
  return prisma.cart.create({
    data: {},
    ...cartWithItems,
  });
}

/**
 * Called when a guest logs in. Merges guest cart items into the
 * customer's cart (summing quantities for identical product+variant combos),
 * then deletes the guest cart.
 */
export async function mergeGuestCartOnLogin(
  guestSessionId: string,
  customerId: string
): Promise<void> {
  const guestCart = await prisma.cart.findFirst({
    where: { sessionId: guestSessionId },
    include: { items: true },
  });

  if (!guestCart || guestCart.items.length === 0) return;

  const customerCart = await getOrCreateCart(customerId);

  for (const guestItem of guestCart.items) {
    const existingItem = customerCart.items.find(
      (i) =>
        i.productId === guestItem.productId &&
        i.variantId === guestItem.variantId &&
        i.lensConfigJson === guestItem.lensConfigJson
    );

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + guestItem.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: customerCart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          quantity: guestItem.quantity,
          lensConfigJson: guestItem.lensConfigJson,
        },
      });
    }
  }


  // Delete the guest cart (cascades to its items)
  await prisma.cart.delete({ where: { id: guestCart.id } });
}
