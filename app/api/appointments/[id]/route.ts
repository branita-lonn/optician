import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { differenceInHours } from "date-fns";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
    });

    if (!appointment) {
      return new NextResponse("Not found", { status: 404 });
    }

    // RBAC: Only the customer who booked it can cancel (admin uses dashboard routes if needed, but requirements focus on customer cancellation here)
    if (appointment.customerId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
      return new NextResponse("Appointment already " + appointment.status.toLowerCase(), { status: 400 });
    }

    // 2-hour rule
    const hoursUntilAppointment = differenceInHours(appointment.scheduledDate, new Date());
    
    if (hoursUntilAppointment < 2) {
      return new NextResponse("Appointments cannot be cancelled within 2 hours of the scheduled time", { status: 400 });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error("[APPOINTMENT_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
