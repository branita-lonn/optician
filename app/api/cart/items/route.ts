// app/api/cart/items/route.ts
// Cart items API — POST to add an item to the cart

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { getOrCreateCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SESSION_COOKIE = "miduka_session_id";

const addItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  lensConfig: z.object({
    needsPrescription: z.boolean(),
    lensType: z.string(),
    lensCoating: z.string(),
    prescriptionId: z.string().nullable().optional(),
    prescriptionSource: z.enum(["saved", "new", "later", "none"]),
  }).optional().nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = addItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { productId, variantId, quantity, lensConfig } = parsed.data;
    const lensConfigJson = lensConfig ? JSON.stringify(lensConfig) : null;

    // Validate product
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found or unavailable" },
        { status: 404 }
      );
    }

    // Validate variant if provided
    let variantStock: number | null = null;
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId, productId, isActive: true },
      });
      if (!variant) {
        return NextResponse.json(
          { error: "Variant not found or unavailable" },
          { status: 404 }
        );
      }
      variantStock = variant.stockQuantity;
    }

    // Stock check
    const availableStock = variantStock ?? product.stockQuantity;
    if (availableStock < quantity) {
      return NextResponse.json(
        { error: "Not enough stock" },
        { status: 400 }
      );
    }

    const session = await auth();
    const cookieStore = await cookies();
    const customerId = session?.user?.id;
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

    const cart = await getOrCreateCart(customerId, sessionId ?? undefined);

    // Check if item already in cart (matching productId, variantId AND lensConfigJson)
    const existingItem = cart.items.find(
      (item) =>
        item.productId === productId &&
        (item.variantId ?? null) === (variantId ?? null) &&
        item.lensConfigJson === lensConfigJson
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > availableStock) {
        return NextResponse.json(
          { error: "Not enough stock" },
          { status: 400 }
        );
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId ?? null,
          quantity,
          lensConfigJson,
        },
      });
    }


    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
            },
            variant: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(updatedCart);
  } catch (error: unknown) {
    console.error("[POST /api/cart/items]", error);
    return NextResponse.json(
      { error: "Failed to add item to cart" },
      { status: 500 }
    );
  }
}
