// app/api/dashboard/prescriptions/[id]/route.ts
// Seller: verify a prescription, add staff notes.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const updateSchema = z.object({
  isVerified: z.boolean().optional(),
  staffNotes: z.string().max(1000).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (session?.user?.role !== "STORE_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const existing = await prisma.prescription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        isVerified: parsed.data.isVerified ?? existing.isVerified,
        staffNotes: parsed.data.staffNotes ?? existing.staffNotes,
        verifiedAt:
          parsed.data.isVerified === true && !existing.isVerified
            ? new Date()
            : existing.verifiedAt,
        verifiedById:
          parsed.data.isVerified === true && !existing.isVerified
            ? session.user.id
            : existing.verifiedById,
      },
    });

    // If just verified, notify customer (non-blocking)
    if (parsed.data.isVerified === true && !existing.isVerified && existing.customerId) {
      notifyCustomerPrescriptionVerified(existing.customerId).catch(console.error);
    }

    return NextResponse.json({ success: true, prescription: updated });
  } catch (error: unknown) {
    console.error("[PATCH /api/dashboard/prescriptions/[id]]", error);
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (session?.user?.role !== "STORE_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
        order: { select: { orderNumber: true, id: true } },
      },
    });

    if (!prescription) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ prescription });
  } catch (error: unknown) {
    console.error("[GET /api/dashboard/prescriptions/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch prescription" }, { status: 500 });
  }
}

async function notifyCustomerPrescriptionVerified(customerId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: customerId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  const store = await prisma.storeSettings.findFirst({ select: { storeName: true } });
  const { sendEmail } = await import("@/lib/mail");
  await sendEmail({
    to: user.email,
    subject: `Your prescription has been verified — ${store?.storeName ?? ""}`,
    html: `
      <p>Hi ${user.name ?? "there"},</p>
      <p>Your prescription has been reviewed and verified by our team. You can now complete your order.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/account/prescriptions">View your prescriptions →</a></p>
    `,
  });
}
