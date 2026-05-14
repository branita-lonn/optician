// app/api/products/batch-slugs/route.ts
// POST /api/products/batch-slugs — Fetches multiple products by slug (max 8) for recently viewed

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProductPublic } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const slugs = body.slugs;

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Limit to max 8 server-side just in case
    const safeSlugs = slugs.slice(0, 8);

    const rawProducts = await prisma.product.findMany({
      where: {
        slug: { in: safeSlugs },
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, altText: true, sortOrder: true, blurDataUrl: true },
          orderBy: { sortOrder: "asc" },
        },
        reviews: {
          select: { rating: true }
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            colour: true,
            size: true,
            material: true,
            priceOverride: true,
            stockQuantity: true,
            sku: true,
            isActive: true,
            frameSize: true,
            lensType: true,
            lensCoating: true,
            prescriptionReady: true,
          },
        },
      },
    });

    // Map to public shape and maintain requested order
    const productMap = new Map<string, ProductPublic>();
    for (const p of rawProducts) {
      productMap.set(p.slug, {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: Number(p.price),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        tags: p.tags,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        isOnSale: p.isOnSale,
        stockQuantity: p.stockQuantity,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        categoryId: p.categoryId,
        category: p.category,
        images: p.images.map((img) => ({
          id: img.id,
          url: img.url,
          blurDataUrl: img.blurDataUrl,
          altText: img.altText,
          sortOrder: img.sortOrder,
        })),
        variants: p.variants.map((v) => ({
          id: v.id,
          colour: v.colour,
          size: v.size,
          material: v.material,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
          stockQuantity: v.stockQuantity,
          sku: v.sku,
          isActive: v.isActive,
          frameSize: v.frameSize ?? null,
          lensType: v.lensType ?? null,
          lensCoating: v.lensCoating ?? null,
          prescriptionReady: v.prescriptionReady,
        })),
        reviewCount: p.reviews.length,
        rating: p.reviews.length > 0 
          ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length 
          : 0,
        productType: p.productType,
        frameMeasurements: p.frameMeasurements ?? null,
        isRxRequired: p.isRxRequired,
        tryOnImageUrl: p.tryOnImageUrl ?? null,
      });
    }

    const orderedProducts = safeSlugs
      .map((slug) => productMap.get(slug))
      .filter((p): p is ProductPublic => p !== undefined);

    return NextResponse.json({ products: orderedProducts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
