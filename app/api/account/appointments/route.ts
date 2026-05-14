import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        customerId: session.user.id,
      },
      orderBy: {
        scheduledDate: "desc",
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[ACCOUNT_APPOINTMENTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
