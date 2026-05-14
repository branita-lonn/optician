// app/(store)/checkout/page.tsx
// 3-step checkout: Contact -> Address -> Payment

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "next-auth/react";
import { ChevronRight, CheckCircle2, AlertCircle, ShoppingBag, Loader2, Gift } from "lucide-react";
import { useCart } from "@/components/store/cart-provider";
import { formatCurrency, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { CheckoutPrescriptionStep } from "@/components/store/checkout-prescription-step";


// ─── KENYA COUNTIES ──────────────────────────────────────────────────────────
const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu",
  "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa",
  "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
  "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
].sort();

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  fullName: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^(\+?254|0)[17]\d{8}$/, "Invalid Kenyan phone number"),
});

const addressSchema = z.object({
  addressLine1: z.string().min(3, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  county: z.string().min(2, "County is required"),
  postalCode: z.string().optional(),
  saveAddress: z.boolean().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;
type AddressFormValues = z.infer<typeof addressSchema>;

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface StoreSettings {
  enableMpesa?: boolean;
  enableStripe?: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { cart, isLoading: cartLoading, subtotal, clearCart } = useCart();
  const items = cart?.items ?? [];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Shipping & Totals
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [giftCardCode, setGiftCardCode] = useState("");
  const [appliedGiftCard, setAppliedGiftCard] = useState<{code: string, discount: number} | null>(null);
  const [giftCardLoading, setGiftCardLoading] = useState(false);

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<"MPESA" | "STRIPE">("MPESA");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { fullName: "", email: "", phone: "" },
  });

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { 
      addressLine1: "", addressLine2: "", city: "", county: "", postalCode: "", saveAddress: false 
    },
  });

  // Redirect if cart is empty once loaded
  useEffect(() => {
    if (!cartLoading && items.length === 0 && !isSubmitting) {
      router.replace("/cart");
    }
  }, [cartLoading, items.length, router, isSubmitting]);


  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Pre-fill logged-in user data and fetch settings
  useEffect(() => {
    if (session?.user && sessionStatus === "authenticated") {
      contactForm.setValue("fullName", session.user.name ?? "");
      contactForm.setValue("email", session.user.email ?? "");
    }

    async function fetchSettings() {
      try {
        const res = await fetch("/api/dashboard/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          
          // Set default payment method based on enabled ones
          if (data.enableMpesa === false && data.enableStripe !== false) {
            setPaymentMethod("STRIPE");
          } else if (data.enableStripe === false && data.enableMpesa !== false) {
            setPaymentMethod("MPESA");
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    }
    void fetchSettings();
  }, [session, sessionStatus, contactForm]);

  // Handle county change to fetch shipping cost
  const watchCounty = addressForm.watch("county");
  useEffect(() => {
    async function fetchShipping() {
      if (!watchCounty) return;
      setShippingLoading(true);
      try {
        const res = await fetch("/api/checkout/shipping-cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ county: watchCounty }),
        });
        if (res.ok) {
          const data = await res.json() as { shippingCost: number };
          setShippingCost(data.shippingCost);
        }
      } catch (err) {
        console.error("Failed to fetch shipping cost", err);
      } finally {
        setShippingLoading(false);
      }
    }
    void fetchShipping();
  }, [watchCounty]);

  // Derived Totals
  const total = useMemo(() => {
    const discount = appliedCoupon?.discount ?? 0;
    const giftDiscount = appliedGiftCard?.discount ?? 0;
    return Math.max(0, subtotal - discount + shippingCost - giftDiscount);
  }, [subtotal, appliedCoupon, shippingCost, appliedGiftCard]);

  // Lens/Rx Items
  const rxItems = useMemo(() => {
    return items
      .filter((item) => item.lensConfigJson)
      .map((item) => ({
        productName: item.product.name,
        variantLabel: [item.variant?.colour, item.variant?.size, item.variant?.material]
          .filter(Boolean)
          .join(" / "),
        lensConfig: item.lensConfigJson ? JSON.parse(item.lensConfigJson) : null,
      }));
  }, [items]);


  // ─── SUBMIT HANDLERS ────────────────────────────────────────────────────────

  function onContactSubmit() {
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onAddressSubmit() {
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json() as { discount?: number; error?: string };

      if (!res.ok) throw new Error(data.error ?? "Invalid coupon");

      setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount: data.discount ?? 0 });
      toast.success("Coupon applied!");
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e.message ?? "Could not apply coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleApplyGiftCard() {
    if (!giftCardCode.trim()) return;
    setGiftCardLoading(true);
    try {
      const currentTotalBeforeGift = subtotal - (appliedCoupon?.discount ?? 0) + shippingCost;
      const res = await fetch("/api/checkout/apply-gift-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: giftCardCode.trim(), total: currentTotalBeforeGift }),
      });
      const data = await res.json() as { code: string; discount?: number; error?: string };

      if (!res.ok) throw new Error(data.error ?? "Invalid gift card");

      setAppliedGiftCard({ code: data.code, discount: data.discount ?? 0 });
      toast.success("Gift card applied!");
      setGiftCardCode("");
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e.message ?? "Could not apply gift card");
    } finally {
      setGiftCardLoading(false);
    }
  }

  async function handlePlaceOrder() {
    // 1. Collect all data
    const contactData = contactForm.getValues();
    const addressData = addressForm.getValues();

    // Collect lens configs
    const lensConfigs = items
      .filter(item => item.lensConfigJson)
      .map(item => ({
        cartItemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        config: JSON.parse(item.lensConfigJson!)
      }));

    // Find the first prescriptionId if multiple exist (current limitation of Order model)
    const primaryRxId = rxItems.find(item => item.lensConfig?.prescriptionId)?.lensConfig?.prescriptionId;

    const payload = {
      ...contactData,
      ...addressData,
      paymentMethod,
      couponCode: appliedCoupon?.code,
      giftCardCode: appliedGiftCard?.code,
      prescriptionId: primaryRxId,
      lensConfigJson: JSON.stringify(lensConfigs),
    };


    setIsSubmitting(true);
    try {
      toast.info("Processing order...");
      
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { success?: boolean; orderId?: string; error?: string };

      if (!res.ok) throw new Error(data.error ?? "Failed to place order");

      if (data.success && data.orderId) {
        toast.success("Order placed successfully!");
        clearCart();
        router.push(`/checkout/success/${data.orderId}`);
      }
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e.message ?? "Failed to place order");
      setIsSubmitting(false);
    }
  }

  if (cartLoading || items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* ─── BREADCRUMBS ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm font-medium mb-8 overflow-x-auto pb-2">
        <span className="text-primary flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Cart
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className={step >= 1 ? "text-primary" : "text-muted-foreground"}>
          Information
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className={step >= 2 ? "text-primary" : "text-muted-foreground"}>
          Shipping
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className={step >= 3 ? "text-primary" : "text-muted-foreground"}>
          Payment
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* ─── LEFT COLUMN: STEPS ────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STEP 1: CONTACT */}
          <section className={`rounded-3xl border border-border bg-card p-6 ${step !== 1 ? 'opacity-60 grayscale-[0.3]' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">1. Contact Information</h2>
              {step > 1 && (
                <button onClick={() => setStep(1)} className="text-sm font-medium text-primary hover:underline">
                  Edit
                </button>
              )}
            </div>
            
            {step === 1 ? (
              <form onSubmit={(e) => { void contactForm.handleSubmit(onContactSubmit)(e); }} className="space-y-4">
                {sessionStatus === "unauthenticated" && (
                  <div className="mb-4 text-sm flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span>Already have an account? <Link href="/auth/login?callbackUrl=/checkout" className="text-primary font-medium hover:underline">Log in</Link> for a faster checkout.</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input {...contactForm.register("fullName")} className="rounded-xl" placeholder="John Doe" />
                  {contactForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive">{contactForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email</label>
                    <Input {...contactForm.register("email")} type="email" className="rounded-xl" placeholder="john@example.com" />
                    {contactForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{contactForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input {...contactForm.register("phone")} className="rounded-xl" placeholder="0712345678" />
                    {contactForm.formState.errors.phone && (
                      <p className="text-xs text-destructive">{contactForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <button type="submit" className="mt-4 w-full md:w-auto inline-flex items-center justify-center h-10 px-6 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/80 font-medium transition-colors">
                  Continue to Shipping
                </button>
              </form>
            ) : (
              <div className="text-sm">
                <p>{contactForm.getValues("fullName")}</p>
                <p className="text-muted-foreground">{contactForm.getValues("email")} • {contactForm.getValues("phone")}</p>
              </div>
            )}
          </section>

          {/* STEP 2: SHIPPING ADDRESS */}
          <section className={`rounded-3xl border border-border bg-card p-6 ${step < 2 ? 'opacity-50 pointer-events-none' : step > 2 ? 'opacity-60 grayscale-[0.3]' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">2. Shipping Address</h2>
              {step > 2 && (
                <button onClick={() => setStep(2)} className="text-sm font-medium text-primary hover:underline">
                  Edit
                </button>
              )}
            </div>

            {step === 2 ? (
              <form onSubmit={(e) => { 
                const handler = addressForm.handleSubmit(onAddressSubmit);
                void handler(e);
              }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Street Address</label>
                  <Input {...addressForm.register("addressLine1")} className="rounded-xl" placeholder="123 Moi Avenue" />
                  {addressForm.formState.errors.addressLine1 && (
                    <p className="text-xs text-destructive">{addressForm.formState.errors.addressLine1.message}</p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Apartment, suite, etc. (optional)</label>
                  <Input {...addressForm.register("addressLine2")} className="rounded-xl" placeholder="Apt 4B" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">City</label>
                    <Input {...addressForm.register("city")} className="rounded-xl" placeholder="Mombasa" />
                    {addressForm.formState.errors.city && (
                      <p className="text-xs text-destructive">{addressForm.formState.errors.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">County</label>
                    <select 
                      {...addressForm.register("county")}
                      className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select County</option>
                      {KENYA_COUNTIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {addressForm.formState.errors.county && (
                      <p className="text-xs text-destructive">{addressForm.formState.errors.county.message}</p>
                    )}
                  </div>
                </div>

                {sessionStatus === "authenticated" && (
                  <div className="flex items-center gap-2 mt-4">
                    <input 
                      type="checkbox" 
                      id="saveAddress" 
                      {...addressForm.register("saveAddress")} 
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <label htmlFor="saveAddress" className="text-sm font-medium cursor-pointer">
                      Save this address for next time
                    </label>
                  </div>
                )}

                <button type="submit" className="mt-4 w-full md:w-auto inline-flex items-center justify-center h-10 px-6 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/80 font-medium transition-colors">
                  Continue to Payment
                </button>
              </form>
            ) : step > 2 ? (
              <div className="text-sm">
                <p>{addressForm.getValues("addressLine1")} {addressForm.getValues("addressLine2")}</p>
                <p className="text-muted-foreground">{addressForm.getValues("city")}, {addressForm.getValues("county")} County</p>
              </div>
            ) : null}
          </section>

          {/* PRESCRIPTION SUMMARY (Only for Rx products) */}
          {rxItems.length > 0 && (
            <section className={cn(
              "transition-opacity duration-300",
              step < 2 ? "opacity-50 pointer-events-none" : "opacity-100"
            )}>
              <CheckoutPrescriptionStep rxItems={rxItems} />
            </section>
          )}


          {/* STEP 3: PAYMENT */}
          <section className={`rounded-3xl border border-border bg-card p-6 ${step < 3 ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-xl font-bold mb-4">3. Payment</h2>
            
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Select Payment Method</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* M-Pesa Option */}
                    {settings?.enableMpesa !== false && (
                      <div 
                        className={`relative flex items-center p-4 border rounded-2xl cursor-pointer transition-colors ${paymentMethod === "MPESA" ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10" : "border-border hover:border-emerald-500/50"}`}
                        onClick={() => setPaymentMethod("MPESA")}
                      >
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="MPESA" 
                          checked={paymentMethod === "MPESA"} 
                          onChange={() => setPaymentMethod("MPESA")}
                          className="sr-only"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">M-PESA STK Push</span>
                          <span className="text-xs text-muted-foreground">Pay instantly via Safaricom</span>
                        </div>
                        <div className={`ml-auto h-4 w-4 rounded-full border border-emerald-500 flex items-center justify-center ${paymentMethod === "MPESA" ? "bg-emerald-500" : ""}`}>
                          {paymentMethod === "MPESA" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    )}

                    {/* Stripe Option */}
                    {settings?.enableStripe !== false && (
                      <div 
                        className={`relative flex items-center p-4 border rounded-2xl cursor-pointer transition-colors ${paymentMethod === "STRIPE" ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10" : "border-border hover:border-indigo-500/50"}`}
                        onClick={() => setPaymentMethod("STRIPE")}
                      >
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="STRIPE" 
                          checked={paymentMethod === "STRIPE"} 
                          onChange={() => setPaymentMethod("STRIPE")}
                          className="sr-only"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">Card Payment</span>
                          <span className="text-xs text-muted-foreground">Visa, Mastercard via Stripe</span>
                        </div>
                        <div className={`ml-auto h-4 w-4 rounded-full border border-indigo-500 flex items-center justify-center ${paymentMethod === "STRIPE" ? "bg-indigo-500" : ""}`}>
                          {paymentMethod === "STRIPE" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    )}
                    
                    {settings?.enableMpesa === false && settings?.enableStripe === false && (
                      <div className="col-span-full p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center font-medium">
                        Online payments are temporarily unavailable. Please contact the store.
                      </div>
                    )}
                  </div>
                </div>

                {paymentMethod === "MPESA" && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-sm">
                    <p className="font-medium text-emerald-800 dark:text-emerald-300 mb-2">M-Pesa Payment Info</p>
                    <p className="text-emerald-700/80 dark:text-emerald-400/80">
                      We will send an STK Push to <span className="font-bold">{contactForm.getValues("phone")}</span>. Make sure your phone is unlocked and enter your PIN when prompted.
                    </p>
                  </div>
                )}

                {paymentMethod === "STRIPE" && (
                  <div className="p-8 rounded-2xl border border-dashed border-border flex items-center justify-center text-center bg-muted/30">
                    <div>
                      <p className="font-medium">Stripe Elements</p>
                      <p className="text-sm text-muted-foreground mt-1">Will be loaded here in the final step.</p>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => void handlePlaceOrder()} 
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center h-12 gap-2 px-6 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/80 font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
                  {isSubmitting ? "Processing..." : `Pay ${formatCurrency(total)}`}
                </button>
              </div>
            )}
          </section>

        </div>

        {/* ─── RIGHT COLUMN: ORDER SUMMARY ───────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-border bg-card p-6 sticky top-24 space-y-6">
            <h2 className="text-xl font-bold">Order Summary</h2>
            
            <div className="space-y-4">
              {items.map((item) => {
                const price = item.variant?.priceOverride ? Number(item.variant.priceOverride) : Number(item.product.price);
                const primaryImage = item.product.images[0]?.url;
                const blurDataUrl = item.product.images[0]?.blurDataUrl;
                const vLabel = [item.variant?.colour, item.variant?.size, item.variant?.material].filter(Boolean).join(" / ");
                return (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0">
                      {primaryImage && <Image src={primaryImage} alt="" fill className="object-cover" sizes="64px" {...(blurDataUrl ? { placeholder: "blur", blurDataURL: blurDataUrl } : {})} />}
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground z-10 shadow-sm border border-background">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium line-clamp-2">{item.product.name}</p>
                      {vLabel && <p className="text-muted-foreground text-xs">{vLabel}</p>}
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(price * item.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Coupon */}
            <div className="space-y-2">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm">
                  <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">{appliedCoupon.code}</span>
                  <button onClick={() => setAppliedCoupon(null)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input 
                    placeholder="Coupon code" 
                    value={couponCode} 
                    onChange={e => setCouponCode(e.target.value)} 
                    className="rounded-xl"
                  />
                  <button 
                    onClick={() => void handleApplyCoupon()}
                    disabled={couponLoading || !couponCode.trim()}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <Separator />

            {/* Gift Card */}
            <div className="space-y-2">
              {appliedGiftCard ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-sm">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-indigo-600" />
                    <span className="font-mono font-medium text-indigo-700 dark:text-indigo-400">{appliedGiftCard.code}</span>
                  </div>
                  <button onClick={() => setAppliedGiftCard(null)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input 
                    placeholder="Gift card code" 
                    value={giftCardCode} 
                    onChange={e => setGiftCardCode(e.target.value)} 
                    className="rounded-xl"
                  />
                  <button 
                    onClick={() => void handleApplyGiftCard()}
                    disabled={giftCardLoading || !giftCardCode.trim()}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {giftCardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </button>
                </div>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span className="font-medium">−{formatCurrency(appliedCoupon.discount)}</span>
                </div>
              )}

              {appliedGiftCard && (
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                  <span>Gift Card</span>
                  <span className="font-medium">−{formatCurrency(appliedGiftCard.discount)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium flex items-center gap-2">
                  {shippingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {step >= 2 ? formatCurrency(shippingCost) : "Calculated next step"}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
