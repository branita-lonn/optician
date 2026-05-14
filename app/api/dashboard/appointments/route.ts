import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "STORE_OWNER") {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as AppointmentStatus | "ALL";
    const date = searchParams.get("date");

    const where: {
      status?: AppointmentStatus;
      scheduledDate?: {
        gte: Date;
        lte: Date;
      };
    } = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.scheduledDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        scheduledDate: "desc",
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[APPOINTMENTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
