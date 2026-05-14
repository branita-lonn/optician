import { AppointmentList } from "@/components/dashboard/appointments/appointment-list";
import { Separator } from "@/components/ui/separator";

export default function AppointmentsPage() {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-sm text-muted-foreground">
              Manage eye tests and consultations
            </p>
          </div>
        </div>
        <Separator />
        <AppointmentList />
      </div>
    </div>
  );
}
