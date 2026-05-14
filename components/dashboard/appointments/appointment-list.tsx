"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  Mail,
  User
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Appointment {
  id: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  type: string;
  status: string;
  scheduledDate: string;
  durationMinutes: number;
  notes?: string;
}

export function AppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/appointments?status=${statusFilter}&date=${dateFilter}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAppointments(data);
    } catch {
      toast.error("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAppointments();
  }, [fetchAppointments]);

  const onConfirm = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboard/appointments/${id}/confirm`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to confirm");
      toast.success("Appointment confirmed and email sent");
      // Trigger a re-fetch
      const refreshResponse = await fetch(`/api/dashboard/appointments?status=${statusFilter}&date=${dateFilter}`);
      const data = await refreshResponse.json();
      setAppointments(data);
    } catch {
      toast.error("Failed to confirm appointment");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "CONFIRMED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmed</Badge>;
      case "COMPLETED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-card p-4 rounded-xl border">
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setLoading(true);
                setStatusFilter(status);
              }}
              className="rounded-full px-4"
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setLoading(true);
              setDateFilter(e.target.value);
            }}
            className="w-40"
          />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No appointments found for this day.
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{format(new Date(appointment.scheduledDate), "p")}</span>
                      <span className="text-xs text-muted-foreground">{appointment.durationMinutes} mins</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{appointment.customer?.name || appointment.guestName}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {appointment.customer?.email || appointment.guestEmail}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{appointment.type.toLowerCase().replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(appointment.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {appointment.status === "PENDING" && (
                          <DropdownMenuItem onClick={() => onConfirm(appointment.id)} className="text-green-600">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirm & Notify
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <User className="w-4 h-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
