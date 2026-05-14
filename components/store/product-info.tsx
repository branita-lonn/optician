// components/store/product-info.tsx
// Client Component — variant selector, quantity control, and Add to Cart action for the product detail page

"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Heart, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/store/cart-provider";
import { formatCurrency } from "@/lib/utils";
import type { ProductWithRelationsSerialized } from "@/types";
import { cn } from "@/lib/utils";
import StockAlertButton from "@/components/store/stock-alert-button";
import { useWishlist } from "@/components/store/wishlist-provider";
import { FlashSaleCountdown } from "@/components/store/flash-sale-countdown";
import { ProductBundleCallout } from "@/components/store/product-bundle-callout";
import { LensConfiguratorModal, type LensConfig } from "@/components/store/lens-configurator-modal";
import type { PrescriptionPublic } from "@/types";
import { useSession } from "next-auth/react";

interface ProductInfoProps {
  product: ProductWithRelationsSerialized;
  externalSelectedColour?: string | null;
  onColourChange?: (colour: string | null) => void;
  bundles?: any[];
}

export default function ProductInfo({ 
  product, 
  externalSelectedColour, 
  onColourChange,
  bundles = []
}: ProductInfoProps) {
  const { addItem } = useCart();

  const [selectedColour, setSelectedColour] = useState<string | null>(externalSelectedColour ?? null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedFrameSize, setSelectedFrameSize] = useState<string | null>(null);
  const [selectedLensType, setSelectedLensType] = useState<string | null>(null);
  const [selectedLensCoating, setSelectedLensCoating] = useState<string | null>(null);

  const { data: session } = useSession();

  const [configuratorOpen, setConfiguratorOpen] = useState(false);
  const [savedPrescriptions, setSavedPrescriptions] = useState<PrescriptionPublic[]>([]);
  const [prescriptionsLoaded, setPrescriptionsLoaded] = useState(false);

  // Sync internal state with external state
  useEffect(() => {
    if (externalSelectedColour !== undefined) {
      setSelectedColour(externalSelectedColour);
    }
  }, [externalSelectedColour]);

  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const { isWishlisted, toggleWishlist, isLoading: wishlistLoading } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  // Derive selected variant from attributes
  const selectedVariant = product.variants.find(
    (v) =>
      (selectedColour ? v.colour === selectedColour : !v.colour) &&
      (selectedSize ? v.size === selectedSize : !v.size) &&
      (selectedMaterial ? v.material === selectedMaterial : !v.material) &&
      (selectedFrameSize ? v.frameSize === selectedFrameSize : !v.frameSize) &&
      (selectedLensType ? v.lensType === selectedLensType : !v.lensType) &&
      (selectedLensCoating ? v.lensCoating === selectedLensCoating : !v.lensCoating) &&
      v.isActive
  );

  const selectedVariantId = selectedVariant?.id;

  // Flash Sale logic
  const activeFlashSale = product.flashSale && new Date(product.flashSale.startTime) <= new Date() && new Date(product.flashSale.endTime) >= new Date()
    ? product.flashSale
    : null;

  // Effective price (flash sale > variant override > base price)
  const effectivePrice = activeFlashSale ? activeFlashSale.salePrice : (selectedVariant?.priceOverride ?? product.price);
  const strikethroughPrice = activeFlashSale ? (selectedVariant?.priceOverride ?? product.price) : product.compareAtPrice;
  const showStrikethrough = activeFlashSale || (product.compareAtPrice && product.compareAtPrice > effectivePrice);

  // Stock
  const totalVariantStock = product.variants.reduce((acc, v) => acc + (v.stockQuantity ?? 0), 0);
  const stockQty =
    product.variants.length > 0
      ? (selectedVariant 
          ? selectedVariant.stockQuantity 
          : totalVariantStock)
      : product.stockQuantity;

  const isOutOfStock = stockQty === 0;
  const isLowStock = !isOutOfStock && stockQty <= 5;

  // Group variant options
  const colours = [...new Set(product.variants.map((v) => v.colour).filter(Boolean))] as string[];
  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))] as string[];
  const materials = [...new Set(product.variants.map((v) => v.material).filter(Boolean))] as string[];
  const frameSizes = [...new Set(product.variants.map((v) => v.frameSize).filter(Boolean))] as string[];
  const lensTypes = [...new Set(product.variants.map((v) => v.lensType).filter(Boolean))] as string[];
  const lensCoatings = [...new Set(product.variants.map((v) => v.lensCoating).filter(Boolean))] as string[];

  function handleOptionSelect(type: 'colour' | 'size' | 'material' | 'frameSize' | 'lensType' | 'lensCoating', value: string) {
    if (type === 'colour') {
      setSelectedColour(value);
      onColourChange?.(value);
    }
    if (type === 'size') setSelectedSize(value);
    if (type === 'material') setSelectedMaterial(value);
    if (type === 'frameSize') setSelectedFrameSize(value);
    if (type === 'lensType') setSelectedLensType(value);
    if (type === 'lensCoating') setSelectedLensCoating(value);
    setQuantity(1);
  }

  async function handleAddToCartClick() {
    if (isOutOfStock) return;

    if (needsConfigurator) {
      await loadPrescriptions();
      setConfiguratorOpen(true);
      return;
    }

    await handleAddToCart(null);
  }

  async function handleAddToCart(lensConfig: LensConfig | null) {
    setIsAdding(true);
    try {
      await addItem({
        productId: product.id,
        variantId: selectedVariantId,
        quantity,
        productName: product.name,
        lensConfig: lensConfig ?? undefined,
      });
    } finally {
      setIsAdding(false);
    }
  }

  const loadPrescriptions = async () => {
    if (prescriptionsLoaded) return;
    try {
      const res = await fetch("/api/prescriptions");
      if (res.ok) {
        const data = await res.json() as { prescriptions: PrescriptionPublic[] };
        setSavedPrescriptions(data.prescriptions ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setPrescriptionsLoaded(true);
    }
  };

  const needsConfigurator =
    product.isRxRequired ||
    (selectedVariant?.prescriptionReady === true &&
      selectedVariant?.lensType !== "Non-Prescription");


  return (
    <div className="flex flex-col gap-5">
      {/* Name */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {activeFlashSale ? (
            <Badge variant="destructive" className="rounded-full text-xs font-bold bg-destructive text-destructive-foreground">
              Flash Sale
            </Badge>
          ) : product.isOnSale && (
            <Badge variant="destructive" className="rounded-full text-xs">
              Sale
            </Badge>
          )}
          {product.isFeatured && (
            <Badge variant="secondary" className="rounded-full text-xs">
              Featured
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight">{product.name}</h1>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-foreground">
            {formatCurrency(effectivePrice)}
          </span>
          {showStrikethrough && strikethroughPrice && Number(strikethroughPrice) > Number(effectivePrice) && (
            <span className="text-lg text-muted-foreground line-through">
              {formatCurrency(strikethroughPrice)}
            </span>
          )}
          {showStrikethrough && strikethroughPrice && Number(strikethroughPrice) > Number(effectivePrice) && (
            <Badge variant="destructive" className="rounded-full text-xs font-bold">
              {Math.round(
                ((Number(strikethroughPrice) - Number(effectivePrice)) /
                  Number(strikethroughPrice)) *
                  100
              )}
              % OFF
            </Badge>
          )}
        </div>

        {activeFlashSale && (
          <div className="bg-primary/5 rounded-3xl p-4 border border-primary/10">
            <FlashSaleCountdown endTime={activeFlashSale.endTime} />
          </div>
        )}
      </div>

      {/* Stock indicator */}
      {isOutOfStock ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Out of stock</span>
        </div>
      ) : isLowStock ? (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <span>Only {stockQty} left in stock</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>In stock</span>
        </div>
      )}

      {/* Stock Alert for out of stock */}
      {isOutOfStock && (
        <StockAlertButton 
          productId={product.id} 
          variantId={selectedVariantId}
          isOutOfStock={isOutOfStock}
        />
      )}

      {/* Prescription required notice */}
      {product.isRxRequired && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>
            A valid prescription is required for this product. You will be prompted to upload or enter your Rx details before checkout.
          </span>
        </div>
      )}

      {/* Frame measurements */}
      {product.frameMeasurements && (() => {
        try {
          const m = JSON.parse(product.frameMeasurements) as Record<string, string>;
          const keys = Object.keys(m);
          if (keys.length === 0) return null;
          return (
            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium mb-3">Frame Measurements</p>
              <div className="grid grid-cols-3 gap-2">
                {keys.map((key) => (
                  <div key={key} className="text-center">
                    <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="text-sm font-semibold">{m[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        } catch {
          return null;
        }
      })()}

      {/* Colour selector */}
      {colours.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Colour:{" "}
            <span className="font-normal text-muted-foreground">
              {selectedColour ?? "Select"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colours.map((colour) => (
              <button
                key={colour}
                onClick={() => handleOptionSelect('colour', colour)}
                className={cn(
                  "rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all",
                  selectedColour === colour
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {colour}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size selector */}
      {sizes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Size:{" "}
            <span className="font-normal text-muted-foreground">
              {selectedSize ?? "Select"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => handleOptionSelect('size', size)}
                className={cn(
                  "rounded-xl border-2 px-4 py-1.5 text-sm font-medium transition-all",
                  selectedSize === size
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Material selector */}
      {materials.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Material:{" "}
            <span className="font-normal text-muted-foreground">
              {selectedMaterial ?? "Select"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {materials.map((material) => (
              <button
                key={material}
                onClick={() => handleOptionSelect('material', material)}
                className={cn(
                  "rounded-xl border-2 px-4 py-1.5 text-sm font-medium transition-all",
                  selectedMaterial === material
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {material}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Frame Size selector */}
      {frameSizes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Frame Size:{" "}
            <span className="font-normal text-muted-foreground">
              {selectedFrameSize ?? "Select"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {frameSizes.map((fs) => (
              <button
                key={fs}
                onClick={() => handleOptionSelect("frameSize", fs)}
                className={cn(
                  "rounded-xl border-2 px-4 py-1.5 text-sm font-medium transition-all",
                  selectedFrameSize === fs
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {fs}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lens Type selector */}
      {lensTypes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Lens Type:{" "}
            <span className="font-normal text-muted-foreground">
              {selectedLensType ?? "Select"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {lensTypes.map((lt) => (
              <button
                key={lt}
                onClick={() => handleOptionSelect("lensType", lt)}
                className={cn(
                  "rounded-xl border-2 px-4 py-1.5 text-sm font-medium transition-all",
                  selectedLensType === lt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {lt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lens Coating selector */}
      {lensCoatings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Lens Coating:{" "}
            <span className="font-normal text-muted-foreground">
              {selectedLensCoating ?? "Select"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {lensCoatings.map((lc) => (
              <button
                key={lc}
                onClick={() => handleOptionSelect("lensCoating", lc)}
                className={cn(
                  "rounded-xl border-2 px-4 py-1.5 text-sm font-medium transition-all",
                  selectedLensCoating === lc
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {lc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Quantity</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-border overflow-hidden">
            {/* A11Y: Min touch target 44px */}
            <button
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="h-11 w-11 flex items-center justify-center text-lg font-medium hover:bg-muted transition-colors disabled:opacity-40"
            >
              −
            </button>
            <span className="w-12 text-center text-sm font-semibold">
              {quantity}
            </span>
            {/* A11Y: Min touch target 44px */}
            <button
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => Math.min(stockQty, q + 1))}
              disabled={quantity >= stockQty}
              className="h-11 w-11 flex items-center justify-center text-lg font-medium hover:bg-muted transition-colors disabled:opacity-40"
            >
              +
            </button>
          </div>
          {stockQty > 0 && (
            <span className="text-sm text-muted-foreground">
              {stockQty} available
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          id="add-to-cart-button"
          size="lg"
          className="flex-1 rounded-2xl gap-2 py-2 border-foreground/30"
          disabled={isOutOfStock || isAdding || (product.variants.length > 0 && !selectedVariantId)}
          onClick={() => void handleAddToCartClick()}
        >
          <ShoppingCart className="h-5 w-5" />
          {isAdding 
            ? "Adding…" 
            : isOutOfStock 
              ? "Out of Stock" 
              : (product.variants.length > 0 && !selectedVariantId)
                ? "Select Options"
                : "Add to Cart"}
        </Button>
        <Button
          id="wishlist-button"
          variant="outline"
          size="lg"
          className={cn(
            "rounded-2xl gap-2 sm:w-auto transition-all duration-300",
            wishlisted && "bg-primary/5 border-primary/30 text-primary"
          )}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          disabled={wishlistLoading}
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart className={cn("h-5 w-5", wishlisted && "fill-current")} />
          <span className="sm:inline">{wishlisted ? "Wishlisted" : "Wishlist"}</span>
        </Button>
      </div>

      {/* Bundles */}
      <ProductBundleCallout bundles={bundles} currentProductId={product.id} />

      {/* Lens Configurator */}
      {needsConfigurator && (
        <LensConfiguratorModal
          open={configuratorOpen}
          onClose={() => setConfiguratorOpen(false)}
          onConfirm={(config) => handleAddToCart(config)}
          productName={product.name}
          isRxRequired={product.isRxRequired}
          savedPrescriptions={savedPrescriptions}
          isLoggedIn={!!session?.user}
          guestEmail={session?.user?.email ?? undefined}
        />
      )}
    </div>
  );
}
