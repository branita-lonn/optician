// components/store/account-prescriptions-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Trash2, FileText, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrescriptionModal } from "./prescription-modal";

interface Prescription {
  id: string;
  odSphere: number | null;
  odCylinder: number | null;
  odAxis: number | null;
  odAdd: number | null;
  osSphere: number | null;
  osCylinder: number | null;
  osAxis: number | null;
  osAdd: number | null;
  pdDistance: number | null;
  pdNear: number | null;
  uploadedFileUrl: string | null;
  isManualEntry: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export function PrescriptionsClient({ prescriptions }: { prescriptions: Prescription[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this prescription?")) return;

    try {
      const res = await fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Prescription deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} className="rounded-full gap-2">
          <Plus className="h-4 w-4" />
          Add New Prescription
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-3xl">
          <div className="bg-muted p-4 rounded-full mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No prescriptions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(rx.createdAt), "PPP")}
                  </div>
                  <Badge variant={rx.isVerified ? "success" : "warning"} className="rounded-full">
                    {rx.isVerified ? (
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verified</span>
                    ) : (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</span>
                    )}
                  </Badge>
                </div>

                {rx.isManualEntry ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <p className="font-semibold text-[10px] uppercase text-muted-foreground">Right Eye (OD)</p>
                      <p>SPH: {rx.odSphere ?? "—"} | CYL: {rx.odCylinder ?? "—"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[10px] uppercase text-muted-foreground">Left Eye (OS)</p>
                      <p>SPH: {rx.osSphere ?? "—"} | CYL: {rx.osCylinder ?? "—"}</p>
                    </div>
                    {rx.pdDistance && (
                      <div className="col-span-2">
                        <p className="font-semibold text-[10px] uppercase text-muted-foreground">Pupillary Distance</p>
                        <p>{rx.pdDistance}mm</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    <div className="bg-muted p-3 rounded-2xl">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Uploaded Prescription</p>
                      <a href={rx.uploadedFileUrl!} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        View file
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(rx.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PrescriptionModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={() => router.refresh()} 
      />
    </div>
  );
}
