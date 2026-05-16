import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import ProductCard from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@prisma/client";
import HomepageSection from "@/components/store/homepage-section";
import { HeroCarousel } from "@/components/store/hero-carousel";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, firstSlide] = await Promise.all([
    prisma.storeSettings.findFirst(),
    prisma.heroSlide.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
  ]);

  return {
    title: settings?.storeName || "MiDuka",
    description: settings?.storeTagline || "Your neighbourhood store, online.",
    openGraph: {
      images: [
        firstSlide?.desktopImageUrl || 
        settings?.heroImageUrl || 
        settings?.logoUrl || 
        "/icons/icon-512.png"
      ],
    },
  };
}
// ─── Serialization helper ──────────────────────────────────────────────────
type RawProduct = Prisma.ProductGetPayload<{
  include: {
    images: { select: { url: true; blurDataUrl: true; sortOrder: true } };
    category: { select: { name: true; slug: true } };
    reviews: { select: { rating: true } };
    flashSale: true;
  };
}>;

function toCardProps(p: RawProduct) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    primaryImage: p.images.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null,
    blurDataUrl: p.images.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.blurDataUrl ?? null,
    category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
    isOnSale: p.isOnSale,
    isFeatured: p.isFeatured,
    stockQuantity: p.stockQuantity,
    createdAt: p.createdAt,
    reviewCount: p.reviews.length,
    rating: p.reviews.length > 0 ? p.reviews.reduce((acc, r: any) => acc + r.rating, 0) / p.reviews.length : 0,
    flashSale: p.flashSale ? {
      ...p.flashSale,
      salePrice: Number(p.flashSale.salePrice),
    } : null,
  } as any;
}

const PRODUCT_INCLUDE = {
  images: { select: { url: true as const, blurDataUrl: true as const, sortOrder: true as const } },
  category: { select: { name: true as const, slug: true as const } },
  reviews: { select: { rating: true as const } },
  flashSale: true,
} satisfies Prisma.ProductInclude;

// ─── Page ─────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Fetch initial data
  const [settings, heroSlides, featured, newArrivals, onSale, categories, bestSellersData] =
    await Promise.all([
      prisma.storeSettings.findFirst(),
      prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        include: PRODUCT_INCLUDE,
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.product.findMany({
        where: { isActive: true, createdAt: { gte: fourteenDaysAgo } },
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.product.findMany({
        where: { isActive: true, isOnSale: true },
        include: PRODUCT_INCLUDE,
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        include: { _count: { select: { products: true } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 8,
      }),
    ]);

  // Fetch Best Seller products separately to maintain relations
  const bestSellerProducts = await prisma.product.findMany({
    where: {
      id: { in: bestSellersData.map(item => item.productId) },
      isActive: true,
    },
    include: PRODUCT_INCLUDE,
  });

  // Sort best sellers by their aggregated quantity
  const sortedBestSellers = [...bestSellerProducts].sort((a, b) => {
    const qtyA = bestSellersData.find(item => item.productId === a.id)?._sum?.quantity ?? 0;
    const qtyB = bestSellersData.find(item => item.productId === b.id)?._sum?.quantity ?? 0;
    return qtyB - qtyA;
  });

  const storeName = settings?.storeName ?? "MiDuka";
  const tagline = settings?.storeTagline ?? "Your neighbourhood store, online.";

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {heroSlides.length > 0 ? (
        <HeroCarousel 
          slides={JSON.parse(JSON.stringify(heroSlides))} 
          enableAutoplay={settings?.heroCarouselAutoplay ?? true}
          autoplayInterval={settings?.heroCarouselInterval ?? 5000}
        />
      ) : (
        <section aria-label="Hero banner" className="relative w-full overflow-hidden">
          {settings?.heroImageUrl ? (
            <div className="relative h-[400px] md:h-[520px]">
              <Image
                src={settings.heroImageUrl}
                alt={settings.heroHeadline ?? storeName}
                fill
                priority
                className="object-cover"
                sizes="100vw"
                {...(settings.heroBlurDataUrl ? { placeholder: "blur", blurDataURL: settings.heroBlurDataUrl } : {})}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-20 gap-4 max-w-2xl">
                {settings.heroHeadline && (
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                    {settings.heroHeadline}
                  </h1>
                )}
                {settings.heroSubheadline && (
                  <p className="text-lg text-muted-foreground">
                    {settings.heroSubheadline}
                  </p>
                )}
                {settings.heroCtaText && settings.heroCtaLink && (
                  <Link href={settings.heroCtaLink}>
                    <Button size="lg" className="rounded-full w-fit">
                      {settings.heroCtaText}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* Gradient fallback */
            <div className="relative h-[400px] md:h-[520px] bg-gradient-to-br from-primary/20 via-primary/5 to-background flex flex-col items-center justify-center text-center px-6 gap-4">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-primary/10 blur-3xl" />
              </div>
              <h1 className="relative text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
                {settings?.heroHeadline || storeName}
              </h1>
              <p className="relative text-lg md:text-xl text-muted-foreground max-w-lg">
                {settings?.heroSubheadline || tagline}
              </p>
              <Link href={settings?.heroCtaLink || "/categories"}>
                <Button size="lg" className="relative rounded-full">
                  {settings?.heroCtaText || "Shop Now"}
                </Button>
              </Link>
            </div>
          )}
        </section>
      )}

      <div className="container mx-auto px-4 flex flex-col gap-12">
        {/* ── Featured Products ─────────────────────────────────────────── */}
        <HomepageSection 
          title="Featured Products" 
          products={featured.map(toCardProps)} 
          viewAllHref="/categories" 
        />

        {/* ── New Arrivals ──────────────────────────────────────────────── */}
        <HomepageSection 
          title="New Arrivals" 
          products={newArrivals.map(toCardProps)} 
          viewAllHref="/categories" 
        />

        {/* ── Best Sellers ──────────────────────────────────────────────── */}
        <HomepageSection 
          title="Best Sellers" 
          products={sortedBestSellers.map(toCardProps)} 
          viewAllHref="/categories" 
        />

        {/* ── On Sale ───────────────────────────────────────────────────── */}
        <HomepageSection 
          title="On Sale" 
          products={onSale.map(toCardProps)} 
          viewAllHref="/products?onSale=true" 
        />

        {/* ── Category Tiles ────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section className="flex flex-col gap-6 py-10">
            <h2 className="text-2xl font-bold text-foreground">Shop by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  id={`category-tile-${cat.slug}`}
                  className="group relative flex flex-col items-center gap-3 rounded-4xl bg-card border border-border/40 p-4 hover:border-primary/20 hover:shadow-lg transition-all duration-300 text-center overflow-hidden"
                >
                  <div className="relative w-16 h-16 rounded-3xl overflow-hidden bg-muted flex-shrink-0">
                    {cat.imageUrl ? (
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        fill
                        sizes="64px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        {...(cat.imageBlurDataUrl ? { placeholder: "blur", blurDataURL: cat.imageBlurDataUrl } : {})}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground line-clamp-1">
                      {cat.name}
                    </p>
                    {/* <p className="text-xs text-muted-foreground">
                      {cat._count.products} item{cat._count.products !== 1 ? "s" : ""}
                    </p> */}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
