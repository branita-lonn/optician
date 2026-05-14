// app/api/dashboard/prescriptions/route.ts
// Seller dashboard: list all prescriptions with pagination and filters.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;
    const verified = searchParams.get("verified"); // "true" | "false" | null
    const search = searchParams.get("q") ?? "";

    const where: any = {};

    if (verified === "true") where.isVerified = true;
    if (verified === "false") where.isVerified = false;

    if (search) {
      where.OR = [
        { guestEmail: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, email: true, image: true } },
          order: { select: { orderNumber: true } },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return NextResponse.json({
      prescriptions,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error: unknown) {
    console.error("[GET /api/dashboard/prescriptions]", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}
