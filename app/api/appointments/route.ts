import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addMinutes } from "date-fns";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json();

    const {
      type,
      scheduledDate, // ISO string
      notes,
      guestName,
      guestEmail,
      guestPhone,
    } = body;

    if (!type || !scheduledDate) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const date = new Date(scheduledDate);
    
    // Default durations
    const durations: Record<string, number> = {
      EYE_TEST: 45,
      FRAME_FITTING: 30,
      CONTACT_LENS_CONSULTATION: 45,
      COLLECTION: 15,
      FOLLOW_UP: 30,
    };

    const durationMinutes = durations[type] || 30;

    // 1. Basic store closing validation (last slot 16:15 for 45min test)
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    const closingTimeMinutes = 17 * 60; // 17:00
    if (timeInMinutes + durationMinutes > closingTimeMinutes) {
      return new NextResponse("Appointment ends after closing time", { status: 400 });
    }

    // 2. Check for overlapping CONFIRMED appointments
    // For simplicity in this stage, we assume 1 slot per time period
    // Realistically, you'd check how many staff are available
    const endTime = addMinutes(date, durationMinutes);

    // Note: A more robust check would involve checking the duration of existing appointments
    // But since duration is in the DB now, we can use it.
    
    // Let's refine the overlap check:
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        scheduledDate: {
          gte: new Date(date.getTime() - 60 * 60 * 1000), // Check within 1 hour buffer
          lte: new Date(date.getTime() + 60 * 60 * 1000),
        }
      }
    });

    const isOverlapping = existingAppointments.some(appt => {
      const apptStart = appt.scheduledDate;
      const apptEnd = addMinutes(apptStart, appt.durationMinutes);
      
      // Check if [date, endTime] overlaps with [apptStart, apptEnd]
      return (date < apptEnd && endTime > apptStart);
    });

    if (isOverlapping) {
      return new NextResponse("This time slot is already booked", { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerId: session?.user?.id || null,
        guestName: session ? null : guestName,
        guestEmail: session ? null : guestEmail,
        guestPhone: session ? null : guestPhone,
        type,
        scheduledDate: date,
        durationMinutes,
        notes,
        status: "PENDING",
      },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("[APPOINTMENTS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
