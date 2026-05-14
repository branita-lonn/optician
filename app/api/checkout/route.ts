// app/api/checkout/route.ts
// Main checkout handler — Creates Order, converts CartItems, triggers Payment Intent (M-Pesa STK)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { getOrCreateCart } from "@/lib/cart";
import { initiateStkPush, formatPhoneNumber } from "@/lib/mpesa";
import { z } from "zod";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import { emitNewOrder } from "@/lib/socket";
import { sendOrderConfirmation } from "@/lib/mail";

const SESSION_COOKIE = "miduka_session_id";

// We need a subset of the frontend schema to validate incoming data
const checkoutSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  county: z.string().min(1),
  postalCode: z.string().optional(),
  saveAddress: z.boolean().optional(),
  paymentMethod: z.enum(["MPESA", "STRIPE"]),
  couponCode: z.string().optional(),
  giftCardCode: z.string().optional(),
  prescriptionId: z.string().optional().nullable(),
  lensConfigJson: z.string().optional().nullable(),
});


export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid checkout data" }, { status: 400 });
    }

    const {
      fullName, email, phone,
      addressLine1, addressLine2, city, county, postalCode, saveAddress,
      paymentMethod, couponCode, giftCardCode,
      prescriptionId, lensConfigJson,
    } = parsed.data;


    const session = await auth();
    const cookieStore = await cookies();
    const customerId = session?.user?.id;
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

    const cart = await getOrCreateCart(customerId, sessionId ?? undefined);

    if (cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 1. Calculate Totals & Validate Stock again
    let subtotal = 0;
    for (const item of cart.items) {
      let price = item.variant?.priceOverride ? Number(item.variant.priceOverride) : Number(item.product.price);

      if (item.product.flashSale) {
        const now = new Date();
        const startTime = new Date(item.product.flashSale.startTime);
        const endTime = new Date(item.product.flashSale.endTime);
        if (now >= startTime && now <= endTime) {
          price = Number(item.product.flashSale.salePrice);
        }
      }

      subtotal += price * item.quantity;

      const availableStock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
      if (item.quantity > availableStock) {
        return NextResponse.json({ error: `Not enough stock for ${item.product.name}` }, { status: 400 });
      }
    }

    // 2. Shipping Cost
    const zones = await prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    let matchedZone = zones.find(z => z.counties.map(c => c.toLowerCase()).includes(county.toLowerCase()));
    if (!matchedZone) matchedZone = zones.find(z => z.name === "Rest of Kenya");
    const shippingCost = matchedZone ? Number(matchedZone.shippingCost) : 500;

    // 3. Coupon Discount
    let discount = 0;
    let validCouponId: string | undefined;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.isActive && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date())) {
        if (!coupon.minimumOrderAmount || subtotal >= Number(coupon.minimumOrderAmount)) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            validCouponId = coupon.id;
            const val = Number(coupon.value);
            if (coupon.type === "PERCENTAGE") discount = (subtotal * val) / 100;
            else if (coupon.type === "FIXED_AMOUNT") discount = val;
            discount = Math.min(discount, subtotal);
          }
        }
      }
    }

    // 3.5. Gift Card Discount
    let giftCardDiscount = 0;
    let validGiftCardId: string | undefined;

    if (giftCardCode) {
      const gc = await prisma.giftCard.findUnique({ where: { code: giftCardCode.toUpperCase() } });
      if (gc && gc.isActive && (!gc.expiresAt || new Date(gc.expiresAt) > new Date())) {
        const remaining = Number(gc.remainingValue);
        if (remaining > 0) {
          validGiftCardId = gc.id;
          giftCardDiscount = Math.min(remaining, Math.max(0, subtotal - discount + shippingCost));
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discount + shippingCost - giftCardDiscount);

    // 4. Create Order using Prisma Transaction
    const order = await prisma.$transaction(async (tx) => {
      // a. Save Address if requested and logged in
      if (saveAddress && customerId) {
        await tx.address.create({
          data: {
            customerId,
            fullName,
            phone,
            addressLine1,
            addressLine2,
            city,
            county,
            postalCode,
            isDefault: true,
          }
        });
      }

      // b. Create the Order
      const newAddress = await tx.address.create({
        data: {
          customerId: customerId ?? null,
          fullName,
          phone,
          addressLine1,
          addressLine2,
          city,
          county,
          postalCode,
        }
      });

      const newOrder = await tx.order.create({
        data: {
          orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
          customerId: customerId ?? null,
          guestName: customerId ? null : fullName,
          guestEmail: customerId ? null : email,
          guestPhone: customerId ? null : phone,
          shippingAddressId: newAddress.id,
          subtotal,
          shippingCost,
          discountAmount: discount,
          total: totalAmount,
          status: totalAmount === 0 ? OrderStatus.CONFIRMED : OrderStatus.PLACED,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentStatus: totalAmount === 0 ? PaymentStatus.PAID : PaymentStatus.PENDING,
          couponId: validCouponId,
          couponCode: validCouponId ? couponCode : null,
          giftCardCode: (validGiftCardId && giftCardCode) ? giftCardCode.toUpperCase() : null,
          giftCardDiscount: giftCardDiscount,
          prescriptionId: prescriptionId ?? null,
          lensConfigJson: lensConfigJson ?? null,
          items: {

            create: cart.items.map(item => {
              let uPrice = item.variant?.priceOverride ? Number(item.variant.priceOverride) : Number(item.product.price);
              if (item.product.flashSale) {
                const now = new Date();
                const startTime = new Date(item.product.flashSale.startTime);
                const endTime = new Date(item.product.flashSale.endTime);
                if (now >= startTime && now <= endTime) {
                  uPrice = Number(item.product.flashSale.salePrice);
                }
              }
              const vLabel = [item.variant?.colour, item.variant?.size, item.variant?.material].filter(Boolean).join(" / ");
              
              return {
                productId: item.productId,
                variantId: item.variantId,
                productName: item.product.name,
                variantLabel: vLabel,
                quantity: item.quantity,
                unitPrice: uPrice,
                total: uPrice * item.quantity,
                lensConfigJson: item.lensConfigJson,
              };
            })
          }
        }
      });

      // c. Decrement stock
      for (const item of cart.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { decrement: item.quantity } }
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: item.quantity } }
          });
        }
      }

      // d. Increment coupon usage
      if (validCouponId) {
        await tx.coupon.update({
          where: { id: validCouponId },
          data: { usedCount: { increment: 1 } }
        });
      }

      // f. Deduct Gift Card balance
      if (validGiftCardId && giftCardDiscount > 0) {
        await tx.giftCard.update({
          where: { id: validGiftCardId },
          data: {
            remainingValue: { decrement: giftCardDiscount },
            redeemedByCustomerId: customerId ?? null,
            orderId: newOrder.id,
          }
        });
      }

      // e. Clear Cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // g. Mark Abandoned Cart as Converted
      await tx.abandonedCartRecord.updateMany({
        where: { cartId: cart.id, convertedAt: null },
        data: { convertedAt: new Date() }
      });

      // h. Create Dashboard Notification for Seller
      await tx.dashboardNotification.create({
        data: {
          type: "NEW_ORDER",
          message: `New Order: ${newOrder.orderNumber} for KES ${totalAmount}`,
          link: `/dashboard/orders/${newOrder.id}`,
        },
      });

      return newOrder;
    });

    // 4.3 Earn Loyalty Points (if logged in)
    if (customerId) {
      const { earnPoints } = await import("@/lib/loyalty");
      await earnPoints(order.id);
    }

    // 4.5. Notify Store Owners via Socket.io
    emitNewOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      customerName: fullName,
    });

    // 4.6. Check for WhatsApp Notifications
    const settings = await prisma.storeSettings.findFirst({
      select: { whatsappOrderNotifications: true, whatsappNotificationNumber: true }
    });

    if (settings?.whatsappOrderNotifications) {
      const sendingNumber = settings.whatsappNotificationNumber || "SYSTEM";
      console.log(`[WHATSAPP_NOTIFICATION] From: ${sendingNumber} To: ${phone}`);
      console.log(`Message: Hello ${fullName}, your order ${order.orderNumber} for KES ${totalAmount} has been received!`);
    }

    // 5. Trigger Payment Integrations
    if (totalAmount === 0) {
      // Order is fully paid by gift card or coupon
      // Skip payment integrations and immediately send order confirmation email
      await sendOrderConfirmation({
        email: email,
        orderNumber: order.orderNumber,
        customerName: fullName,
        totalAmount: Number(order.total),
        shippingAddress: `${addressLine1}, ${city}`,
        orderId: order.id,
      });
    } else if (paymentMethod === "MPESA") {
      try {
        const formattedPhone = formatPhoneNumber(phone);
        // Only trigger STK push if env vars are present (avoid crashing in dev without credentials)
        if (process.env.MPESA_CONSUMER_KEY) {
          const stkResponse = await initiateStkPush({
            phoneNumber: formattedPhone,
            amount: totalAmount,
            accountReference: order.id,
            transactionDesc: `Payment for Order ${order.id}`,
          });

          // Update order with checkout request ID for webhook matching
          await prisma.order.update({
            where: { id: order.id },
            data: { mpesaCheckoutRequestId: stkResponse.CheckoutRequestID }
          });
        } else {
          console.warn("M-Pesa credentials missing, skipping STK push for order", order.id);
        }
      } catch (err) {
        console.error("STK Push failed:", err);
        // We still return success to the frontend so it goes to the confirmation page,
        // but the payment status remains PENDING. The user will be asked to try again or pay manually.
      }
    } else if (paymentMethod === "STRIPE") {
      // In a real implementation, you'd create a Stripe PaymentIntent here and return the client_secret.
      // For Stage 4, if they pick Stripe, we just proceed (or return a dummy token).
      console.log("Stripe payment selected for order", order.id);
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error: unknown) {
    console.error("[POST /api/checkout]", error);
    return NextResponse.json(
      { error: "Failed to process checkout" },
      { status: 500 }
    );
  }
}
