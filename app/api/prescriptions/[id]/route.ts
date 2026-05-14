// app/api/prescriptions/[id]/route.ts
// Customer: get a single prescription they own. Delete (soft-delete via deactivation).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription || prescription.customerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ prescription });
  } catch (error: unknown) {
    console.error("[GET /api/prescriptions/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch prescription" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      select: { customerId: true, orderId: true, uploadedFilePublicId: true },
    });

    if (!prescription || prescription.customerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Do not allow deletion if linked to an order
    if (prescription.orderId) {
      return NextResponse.json(
        { error: "Cannot delete a prescription linked to an order." },
        { status: 409 }
      );
    }

    // Delete Cloudinary file if present
    if (prescription.uploadedFilePublicId) {
      const { deleteImage } = await import("@/lib/cloudinary");
      await deleteImage(prescription.uploadedFilePublicId).catch((err) =>
        console.error("[CLOUDINARY_DELETE]", err)
      );
    }

    await prisma.prescription.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[DELETE /api/prescriptions/[id]]", error);
    return NextResponse.json({ error: "Failed to delete prescription" }, { status: 500 });
  }
}
