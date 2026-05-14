import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendAppointmentConfirmation } from "@/lib/mail";
import { format } from "date-fns";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "STORE_OWNER") {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!appointment) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (appointment.status !== "PENDING") {
      return new NextResponse("Only pending appointments can be confirmed", { status: 400 });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        status: "CONFIRMED",
        confirmationSentAt: new Date(),
      },
    });

    // Send confirmation email
    const email = appointment.customer?.email || appointment.guestEmail;
    const name = appointment.customer?.name || appointment.guestName || "Customer";
    
    if (email) {
      await sendAppointmentConfirmation({
        email,
        customerName: name,
        appointmentType: appointment.type,
        scheduledDate: format(appointment.scheduledDate, "PPPP"),
        scheduledTime: format(appointment.scheduledDate, "p"),
        status: "CONFIRMED",
      });
    }

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error("[APPOINTMENT_CONFIRM]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
