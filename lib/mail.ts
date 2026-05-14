// lib/mail.ts
// Utility for sending transactional emails

import { Resend } from "resend";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmation";
import { OrderStatusUpdateEmail } from "@/emails/order-status-update";
import { AbandonedCartEmail } from "@/emails/abandoned-cart";
import React from "react";
import { render } from "@react-email/components";
import { OrderStatus } from "@prisma/client";

export const resend = new Resend(process.env.RESEND_API_KEY);

interface SendOrderConfirmationParams {
  email: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  shippingAddress: string;
  orderId: string;
}

export async function sendOrderConfirmation({
  email,
  orderNumber,
  customerName,
  totalAmount,
  shippingAddress,
  orderId,
}: SendOrderConfirmationParams) {
  try {
    const statusUrl = `${process.env.NEXTAUTH_URL}/checkout/success/${orderId}`;
    
    const html = await render(
      React.createElement(OrderConfirmationEmail, {
        orderNumber,
        customerName,
        totalAmount,
        shippingAddress,
        statusUrl,
      })
    );
    
    await resend.emails.send({
      from: "MiDuka <orders@miduka.com>", // You must verify this domain in Resend
      to: email,
      subject: `Order Confirmed: ${orderNumber}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    // We don't throw here to avoid failing the whole checkout/webhook flow
  }
}

interface SendOrderStatusUpdateParams {
  email: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  orderId: string;
}

export async function sendOrderStatusUpdate({
  email,
  orderNumber,
  customerName,
  status,
  orderId,
}: SendOrderStatusUpdateParams) {
  try {
    const statusUrl = `${process.env.NEXTAUTH_URL}/account/orders/${orderId}`;
    
    const html = await render(
      React.createElement(OrderStatusUpdateEmail, {
        orderNumber,
        customerName,
        status,
        statusUrl,
      })
    );
    
    await resend.emails.send({
      from: "MiDuka <orders@miduka.com>",
      to: email,
      subject: `Order Update: ${orderNumber} is now ${status.replace("_", " ")}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send order status update email:", error);
  }
}

interface SendAbandonedCartParams {
  email: string;
  customerName: string;
  recoveryUrl: string;
  items: { name: string; quantity: number; price: number }[];
}

export async function sendAbandonedCart({
  email,
  customerName,
  recoveryUrl,
  items,
}: SendAbandonedCartParams) {
  try {
    const html = await render(
      React.createElement(AbandonedCartEmail, {
        customerName,
        recoveryUrl,
        items,
      })
    );

    await resend.emails.send({
      from: "MiDuka <orders@miduka.com>",
      to: email,
      subject: "Did you forget something?",
      html,
    });
  } catch (error) {
    console.error("Failed to send abandoned cart email:", error);
    throw error;
  }
}
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    await resend.emails.send({
      from: "MiDuka <notifications@miduka.com>",
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
