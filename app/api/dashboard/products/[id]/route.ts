// app/api/dashboard/products/[id]/route.ts
// API route for fetching, updating, and deleting a single product

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/generate-slug";
import { generateBlurDataUrl } from "@/lib/cloudinary-blur";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const session = await auth();

    if (!session || session.user.role !== "STORE_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`[PRODUCT_GET] ${error.message}`);
    } else {
      console.error(`[PRODUCT_GET] Unknown error`);
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
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

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let updatedSlug = existingProduct.slug;

    if (name && name !== existingProduct.name) {
      updatedSlug = await generateUniqueSlug(name, async (currentSlug) => {
        const existing = await prisma.product.findUnique({
          where: { slug: currentSlug },
        });
        return !!existing && existing.id !== productId;
      });
    }

    const product = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          name,
          slug: updatedSlug,
          description,
          price,
          compareAtPrice,
          categoryId: categoryId || null,
          tags: tags || [],
          isActive: isActive !== undefined ? isActive : existingProduct.isActive,
          isFeatured: isFeatured !== undefined ? isFeatured : existingProduct.isFeatured,
          isOnSale: isOnSale !== undefined ? isOnSale : existingProduct.isOnSale,
          stockQuantity: stockQuantity !== undefined ? stockQuantity : existingProduct.stockQuantity,
          productType: body.productType ?? undefined,
          frameMeasurements: body.frameMeasurements ?? undefined,
          isRxRequired: body.isRxRequired ?? undefined,
          tryOnImageUrl: body.tryOnImageUrl ?? undefined,
        },
      });

      if (images) {
        await tx.productImage.deleteMany({
          where: { productId },
        });

        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const url = typeof img === "string" ? img : img.url;
            const blurDataUrl = (typeof img === "object" && img.blurDataUrl) 
              ? img.blurDataUrl 
              : await generateBlurDataUrl(url);

            await tx.productImage.create({
              data: {
                productId,
                url,
                blurDataUrl,
                colour: typeof img === "string" ? null : (img.colour || null),
                sortOrder: i,
              },
            });
          }
        }
      }

      if (variants) {
        const existingVariants = await tx.productVariant.findMany({
          where: { productId },
        });

        const incomingVariantIds = variants.map((v: { id?: string }) => v.id).filter(Boolean);

        const variantsToDelete = existingVariants
          .filter((ev) => !incomingVariantIds.includes(ev.id))
          .map((ev) => ev.id);

        if (variantsToDelete.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: variantsToDelete } },
          });
        }

        for (const variant of variants) {
          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                colour: variant.colour,
                size: variant.size,
                material: variant.material,
                priceOverride: variant.priceOverride,
                stockQuantity: variant.stockQuantity || 0,
                sku: variant.sku,
                isActive: variant.isActive !== undefined ? variant.isActive : true,
                frameSize: variant.frameSize || null,
                lensType: variant.lensType || null,
                lensCoating: variant.lensCoating || null,
                prescriptionReady: variant.prescriptionReady ?? false,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId,
                colour: variant.colour,
                size: variant.size,
                material: variant.material,
                priceOverride: variant.priceOverride,
                stockQuantity: variant.stockQuantity || 0,
                sku: variant.sku,
                isActive: variant.isActive !== undefined ? variant.isActive : true,
                frameSize: variant.frameSize || null,
                lensType: variant.lensType || null,
                lensCoating: variant.lensCoating || null,
                prescriptionReady: variant.prescriptionReady ?? false,
              },
            });
          }
        }
      }

      return updatedProduct;
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error(`[PRODUCT_PUT]`, error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const session = await auth();

    if (!session || session.user.role !== "STORE_OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch images before deletion so we can clean up Cloudinary afterwards
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: { select: { url: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check for linked order items before attempting delete
    const orderItemCount = await prisma.orderItem.count({
      where: { productId },
    });

    if (orderItemCount > 0) {
      return NextResponse.json(
        {
          error: `This product cannot be deleted because it is linked to ${orderItemCount} order${orderItemCount === 1 ? "" : "s"}. To keep your order history intact, consider deactivating it instead.`,
          code: "PRODUCT_HAS_ORDERS",
        },
        { status: 409 }
      );
    }

    // Delete product — ProductImage and ProductVariant records are cascade-deleted
    await prisma.product.delete({ where: { id: productId } });

    // Clean up Cloudinary images after DB delete (best-effort)
    // Extract publicId from Cloudinary URL: .../upload/v<version>/<publicId>.<ext>
    const { deleteImage } = await import("@/lib/cloudinary");
    for (const image of product.images) {
      const match = image.url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
      if (match?.[1]) await deleteImage(match[1]);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`[PRODUCT_DELETE] ${error.message}`);
    } else {
      console.error(`[PRODUCT_DELETE] Unknown error`);
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
