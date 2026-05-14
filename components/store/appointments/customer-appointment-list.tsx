"use client";

import { useState, useEffect } from "react";
import { format, isBefore, subHours } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

interface Appointment {
  id: string;
  type: string;
  status: string;
  scheduledDate: string;
  durationMinutes: number;
  notes?: string;
}

export function CustomerAppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/account/appointments");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        if (isMounted) setAppointments(data);
      } catch (error) {
        console.error("Failed to fetch appointments", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const onCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to cancel appointment");
      }
      toast.success("Appointment cancelled successfully");
      
      // Refresh list
      const refreshResponse = await fetch("/api/account/appointments");
      const data = await refreshResponse.json();
      setAppointments(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel appointment";
      toast.error(message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Confirmation</Badge>;
      case "CONFIRMED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold">Confirmed</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-3xl border-2 border-dashed">
        <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No appointments found</h3>
        <p className="text-muted-foreground mb-6">You haven&apos;t booked any eye tests or consultations yet.</p>
        <Link href="/appointments">
          <Button className="rounded-full">Book Now</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {appointments.map((appointment) => {
        const appointmentDate = new Date(appointment.scheduledDate);
        const canCancel = appointment.status !== "CANCELLED" && 
                          appointment.status !== "COMPLETED" && 
                          isBefore(new Date(), subHours(appointmentDate, 2));

        return (
          <Card key={appointment.id} className="rounded-3xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                {getStatusBadge(appointment.status)}
              </div>
              
              <h3 className="text-lg font-bold mb-1">
                {appointment.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </h3>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{format(appointmentDate, "PPP 'at' p")} ({appointment.durationMinutes} min)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Main Store (Downtown)</span>
                </div>
              </div>

              {appointment.notes && (
                <div className="bg-muted/50 p-3 rounded-xl mb-6 text-sm italic text-muted-foreground">
                  &ldquo;{appointment.notes}&rdquo;
                </div>
              )}

              <div className="flex gap-2">
                {canCancel ? (
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-full text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20"
                    onClick={() => onCancel(appointment.id)}
                  >
                    Cancel Appointment
                  </Button>
                ) : (
                  (appointment.status === "PENDING" || appointment.status === "CONFIRMED") && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-full w-full">
                      <AlertCircle className="w-4 h-4" />
                      <span>Cannot cancel within 2 hours of visit</span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
