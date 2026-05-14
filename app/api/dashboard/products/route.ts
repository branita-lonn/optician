// app/api/dashboard/products/route.ts
// API route for fetching and creating products

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/generate-slug";
import { computeCompleteness } from "@/lib/product-completeness";
import { ProductWithRelations } from "@/types";
import { generateBlurDataUrl } from "@/lib/cloudinary-blur";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "STORE_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const productsWithScore = products.map((product) => ({
      ...product,
      completenessScore: computeCompleteness(product as ProductWithRelations),
    }));

    return NextResponse.json(productsWithScore);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`[PRODUCTS_GET] ${error.message}`);
    } else {
      console.error(`[PRODUCTS_GET] Unknown error`);
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log("POST /api/dashboard/products - HIT");
  try {
    const session = await auth();

    if (!session || session.user.role !== "STORE_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      price,
      compareAtPrice,
      categoryId,
      tags,
      isActive,
      isFeatured,
      isOnSale,
      stockQuantity,
      images,
      variants,
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    }

    const slug = await generateUniqueSlug(name, async (currentSlug) => {
      const existing = await prisma.product.findUnique({
        where: { slug: currentSlug },
      });
      return !!existing;
    });

    console.log("CREATING PRODUCT IN DB - Payload:", { name, price, categoryId, imagesCount: images?.length });
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          slug,
          description,
          price,
          compareAtPrice,
          categoryId: categoryId || null,
          tags: tags || [],
          isActive: isActive !== undefined ? isActive : true,
          isFeatured: isFeatured || false,
          isOnSale: isOnSale || false,
          stockQuantity: stockQuantity || 0,
          productType: body.productType ?? "GENERAL",
          frameMeasurements: body.frameMeasurements || null,
          isRxRequired: body.isRxRequired ?? false,
          tryOnImageUrl: body.tryOnImageUrl || null,
        },
      });

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const url = typeof img === "string" ? img : img.url;
          const blurDataUrl = (typeof img === "object" && img.blurDataUrl) 
            ? img.blurDataUrl 
            : await generateBlurDataUrl(url);
          
          await tx.productImage.create({
            data: {
              productId: newProduct.id,
              url,
              blurDataUrl,
              colour: typeof img === "string" ? null : (img.colour || null),
              sortOrder: i,
            },
          });
        }
      }

      if (variants && variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((v: { colour?: string; size?: string; material?: string; priceOverride?: number; stockQuantity?: number; sku?: string; isActive?: boolean; frameSize?: string; lensType?: string; lensCoating?: string; prescriptionReady?: boolean }) => ({
            productId: newProduct.id,
            colour: v.colour,
            size: v.size,
            material: v.material,
            priceOverride: v.priceOverride,
            stockQuantity: v.stockQuantity || 0,
            sku: v.sku,
            isActive: v.isActive !== undefined ? v.isActive : true,
            frameSize: v.frameSize || null,
            lensType: v.lensType || null,
            lensCoating: v.lensCoating || null,
            prescriptionReady: v.prescriptionReady ?? false,
          })),
        });
      }

      return newProduct;
    });

    console.log("PRODUCT CREATED SUCCESSFULLY:", product.id);
    return NextResponse.json(product);
  } catch (error: any) {
    console.error(`[PRODUCTS_POST]`, error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
