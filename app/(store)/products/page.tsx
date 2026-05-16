// app/(store)/products/page.tsx
// All products page — grid with filters and sort

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ProductFilters from "@/components/store/product-filters";
import ProductSort from "@/components/store/product-sort";
import ProductGrid from "@/components/store/product-grid";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import Link from "next/link";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.storeSettings.findFirst();
  const storeName = settings?.storeName || "MiDuka";

  return {
    title: `All Products — Browse ${storeName}`,
    description: `Browse our full collection of products at ${storeName}. High quality frames, lenses, and accessories.`,
    alternates: {
      canonical: "/products",
    },
  };
}

export default async function ProductsPage() {
  // Fetch distinct sizes & colours for filters
  const [distinctSizes, distinctColours, productsCount] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, size: { not: null }, product: { isActive: true } },
      select: { size: true },
      distinct: ["size"],
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, colour: { not: null }, product: { isActive: true } },
      select: { colour: true },
      distinct: ["colour"],
    }),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  const sizes = distinctSizes.map((v) => v.size!).filter(Boolean).sort();
  const colours = distinctColours.map((v) => v.colour!).filter(Boolean).sort();

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <div className="container mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Header */}
        <div>
          <nav aria-label="breadcrumb" className="text-sm text-muted-foreground mb-2">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="text-foreground">All Products</span>
          </nav>
          <h1 className="text-3xl font-bold text-foreground">All Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {productsCount} product{productsCount !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Filters + Grid layout */}
        <div className="flex gap-8 items-start">
          <ProductFilters sizes={sizes} colours={colours} mode="desktop" />

          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Mobile filter trigger + sort row */}
            <div className="flex items-center gap-3 flex-wrap">
              <Suspense fallback={<Skeleton className="h-9 w-32 rounded-2xl" />}>
                <ProductFilters sizes={sizes} colours={colours} mode="mobile" />
              </Suspense>
              <div className="ml-auto">
                <Suspense fallback={<Skeleton className="h-9 w-44 rounded-2xl" />}>
                  <ProductSort />
                </Suspense>
              </div>
            </div>

            <Suspense fallback={<Skeleton className="h-64 w-full rounded-3xl" />}>
              <ProductGrid />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
