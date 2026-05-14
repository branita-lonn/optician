// app/api/dashboard/orders/[id]/status/route.ts
// API route to update order status and trigger customer notification.
// STORE_OWNER only.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, OrderStatus } from "@prisma/client";
import { sendOrderStatusUpdate } from "@/lib/mail";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session || session.user?.role !== UserRole.STORE_OWNER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: { select: { email: true, name: true } },
        prescription: true,
      }

    });

    // Determine recipient email and name
    const email = order.customer?.email || order.guestEmail;
    const name = order.customer?.name || order.guestName || "Customer";

    if (email) {
      // Trigger status update email (fire-and-forget)
      sendOrderStatusUpdate({
        email,
        orderNumber: order.orderNumber,
        customerName: name,
        status: status as OrderStatus,
        orderId: order.id
      });
    }

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error("[PATCH /api/dashboard/orders/[id]/status]", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
