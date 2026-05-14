// app/api/prescriptions/route.ts
// Customer-facing: Create a new prescription record. List own prescriptions.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

// Zod schema for a prescription — all clinical fields are optional
// (customer may only upload a file without manual entry)
const prescriptionSchema = z.object({
  // Right eye
  odSphere: z.coerce.number().min(-30).max(30).optional().nullable(),
  odCylinder: z.coerce.number().min(-10).max(10).optional().nullable(),
  odAxis: z.coerce.number().int().min(0).max(180).optional().nullable(),
  odAdd: z.coerce.number().min(0).max(4).optional().nullable(),
  // Left eye
  osSphere: z.coerce.number().min(-30).max(30).optional().nullable(),
  osCylinder: z.coerce.number().min(-10).max(10).optional().nullable(),
  osAxis: z.coerce.number().int().min(0).max(180).optional().nullable(),
  osAdd: z.coerce.number().min(0).max(4).optional().nullable(),
  // PD
  pdDistance: z.coerce.number().min(40).max(80).optional().nullable(),
  pdNear: z.coerce.number().min(40).max(80).optional().nullable(),
  pdRight: z.coerce.number().min(20).max(45).optional().nullable(),
  pdLeft: z.coerce.number().min(20).max(45).optional().nullable(),
  // Source
  uploadedFileUrl: z.string().url().optional().nullable(),
  uploadedFilePublicId: z.string().optional().nullable(),
  isManualEntry: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
  // Guest support
  guestEmail: z.string().email().optional().nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const body: unknown = await request.json();
    const parsed = prescriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid prescription data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Must have either a file upload or at least one sphere value
    const hasManualData =
      data.odSphere != null ||
      data.osSphere != null;
    const hasFileUpload = !!data.uploadedFileUrl;

    if (!hasManualData && !hasFileUpload) {
      return NextResponse.json(
        { error: "Please provide prescription values or upload a prescription file." },
        { status: 400 }
      );
    }

    const customerId = session?.user?.id ?? null;
    const guestEmail = !customerId ? (data.guestEmail ?? null) : null;

    if (!customerId && !guestEmail) {
      return NextResponse.json(
        { error: "Guest users must provide an email address." },
        { status: 400 }
      );
    }

    const prescription = await prisma.prescription.create({
      data: {
        customerId,
        guestEmail,
        odSphere: data.odSphere ?? null,
        odCylinder: data.odCylinder ?? null,
        odAxis: data.odAxis ?? null,
        odAdd: data.odAdd ?? null,
        osSphere: data.osSphere ?? null,
        osCylinder: data.osCylinder ?? null,
        osAxis: data.osAxis ?? null,
        osAdd: data.osAdd ?? null,
        pdDistance: data.pdDistance ?? null,
        pdNear: data.pdNear ?? null,
        pdRight: data.pdRight ?? null,
        pdLeft: data.pdLeft ?? null,
        uploadedFileUrl: data.uploadedFileUrl ?? null,
        uploadedFilePublicId: data.uploadedFilePublicId ?? null,
        isManualEntry: data.isManualEntry,
        notes: data.notes ?? null,
      },
    });

    // Notify seller via email (non-blocking — do not await)
    notifySellerNewPrescription(prescription.id, customerId, guestEmail).catch(
      (err) => console.error("[PRESCRIPTION_NOTIFY]", err)
    );

    return NextResponse.json({ success: true, prescriptionId: prescription.id }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/prescriptions]", error);
    return NextResponse.json({ error: "Failed to save prescription" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        odSphere: true,
        odCylinder: true,
        odAxis: true,
        odAdd: true,
        osSphere: true,
        osCylinder: true,
        osAxis: true,
        osAdd: true,
        pdDistance: true,
        pdNear: true,
        uploadedFileUrl: true,
        isManualEntry: true,
        isVerified: true,
        verifiedAt: true,
        notes: true,
        orderId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ prescriptions });
  } catch (error: unknown) {
    console.error("[GET /api/prescriptions]", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

// ─── Internal helper ──────────────────────────────────────────────────────────

async function notifySellerNewPrescription(
  prescriptionId: string,
  customerId: string | null,
  guestEmail: string | null
): Promise<void> {
  const store = await prisma.storeSettings.findFirst({
    select: { storeName: true, storeEmail: true },
  });

  if (!store?.storeEmail) return;

  const { sendEmail } = await import("@/lib/mail");
  await sendEmail({
    to: store.storeEmail,
    subject: `New Prescription Submitted — ${store.storeName}`,
    html: `
      <p>A new prescription has been submitted.</p>
      <p><strong>Prescription ID:</strong> ${prescriptionId}</p>
      <p><strong>Customer:</strong> ${customerId ? `User ID: ${customerId}` : `Guest: ${guestEmail}`}</p>
      <p><a href="${process.env.NEXTAUTH_URL}/dashboard/prescriptions">Review in Dashboard →</a></p>
    `,
  });
}
