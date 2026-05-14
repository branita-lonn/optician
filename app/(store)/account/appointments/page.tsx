import { CustomerAppointmentList } from "@/components/store/appointments/customer-appointment-list";
import { Calendar } from "lucide-react";

export const metadata = {
  title: "My Appointments | MiDuka Optician",
};

export default function AccountAppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">Manage your eye tests and follow-up visits</p>
        </div>
      </div>
      
      <CustomerAppointmentList />
    </div>
  );
}
