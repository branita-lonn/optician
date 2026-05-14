// app/api/products/route.ts
// GET /api/products — public product search with filters, sort, and pagination

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ProductPublic, ProductsApiResponse } from "@/types";
import { generateText } from "@/lib/ai";

export const dynamic = "force-dynamic";

const SORT_MAP: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  best_selling: { createdAt: "desc" },  // placeholder until orders exist
  most_reviewed: { reviews: { _count: "desc" } },
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const sp = req.nextUrl.searchParams;

    const q = sp.get("q")?.trim() ?? "";
    const category = sp.get("category") ?? "";
    const minPrice = sp.get("minPrice") ? parseFloat(sp.get("minPrice")!) : undefined;
    const maxPrice = sp.get("maxPrice") ? parseFloat(sp.get("maxPrice")!) : undefined;
    const sizes = sp.get("size") ? sp.get("size")!.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const colours = sp.get("colour") ? sp.get("colour")!.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const onSale = sp.get("onSale") === "true";
    const inStock = sp.get("inStock") === "true";
    const sort = sp.get("sort") ?? "newest";
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const limit = Math.min(40, Math.max(1, parseInt(sp.get("limit") ?? "20", 10)));

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      SORT_MAP[sort] ?? SORT_MAP.newest;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      }),
      ...(category && { category: { slug: category } }),
      ...(minPrice !== undefined && { price: { gte: minPrice } }),
      ...(maxPrice !== undefined && {
        price: minPrice !== undefined ? { gte: minPrice, lte: maxPrice } : { lte: maxPrice },
      }),
      ...(sizes.length > 0 && {
        variants: { some: { size: { in: sizes }, isActive: true } },
      }),
      ...(colours.length > 0 && {
        variants: { some: { colour: { in: colours }, isActive: true } },
      }),
      ...(onSale && { isOnSale: true }),
      ...(inStock && { stockQuantity: { gt: 0 } }),
    };

    const include = {
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, altText: true, sortOrder: true, blurDataUrl: true }, orderBy: { sortOrder: "asc" } as const },
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
      reviews: {
        select: {
          rating: true,
        },
      },
      flashSale: true,
    };

    let [total, rawProducts] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include,
      }),
    ]);

    let expandedFrom: string | null = null;

    // Smart Expansion: If no results and there was a query, try expanding the search
    if (total === 0 && q) {
        try {
            const expansionPrompt = `Expand the search term "${q}" into semantically similar alternatives for a fashion/lifestyle e-commerce store. Instruct the model to respond with ONLY a JSON array of strings — no explanation, no markdown. Example: "blue dress" -> ["navy dress", "cobalt dress", "royal blue dress", "blue maxi dress"]`;
            const expansionJson = await generateText(expansionPrompt, 200);
            
            // Clean up possible markdown wrappers if AI didn't follow "ONLY JSON" instruction
            let cleanJson = expansionJson.replace(/```json|```/g, "").trim();
            const startIdx = cleanJson.indexOf('[');
            const endIdx = cleanJson.lastIndexOf(']');
            if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
                cleanJson = cleanJson.substring(startIdx, endIdx + 1);
            }
            const expandedTerms: string[] = JSON.parse(cleanJson);
            
            if (Array.isArray(expandedTerms) && expandedTerms.length > 0) {
                const expandedWhere: Prisma.ProductWhereInput = {
                    ...where,
                    OR: expandedTerms.map(term => ({
                        OR: [
                            { name: { contains: term, mode: "insensitive" } },
                            { description: { contains: term, mode: "insensitive" } },
                            { tags: { has: term } },
                        ]
                    }))
                };
                
                const [expTotal, expRawProducts] = await Promise.all([
                    prisma.product.count({ where: expandedWhere }),
                    prisma.product.findMany({
                        where: expandedWhere,
                        orderBy,
                        skip: (page - 1) * limit,
                        take: limit,
                        include,
                    }),
                ]);
                
                if (expTotal > 0) {
                    total = expTotal;
                    rawProducts = expRawProducts;
                    expandedFrom = q;
                }
            }
        } catch (e) {
            console.error("[SEARCH_EXPANSION_ERROR]", e);
            // Fallback: return original empty results
        }
    }

    const products: ProductPublic[] = rawProducts.map((p) => ({
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
      flashSale: (p as any).flashSale ? {
        ...(p as any).flashSale,
        salePrice: Number((p as any).flashSale.salePrice),
        startTime: (p as any).flashSale.startTime.toISOString(),
        endTime: (p as any).flashSale.endTime.toISOString(),
      } : null,
      productType: p.productType,
      frameMeasurements: p.frameMeasurements ?? null,
      isRxRequired: p.isRxRequired,
      tryOnImageUrl: p.tryOnImageUrl ?? null,
    }));

    const response: ProductsApiResponse = {
      products,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      expandedFrom,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
