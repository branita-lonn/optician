// components/dashboard/prescriptions-client.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { 
  Eye, 
  Search, 
  FileText, 
  User, 
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Prescription {
  id: string;
  odSphere: number | string | null;
  odCylinder: number | string | null;
  odAxis: number | null;
  odAdd: number | string | null;
  osSphere: number | string | null;
  osCylinder: number | string | null;
  osAxis: number | null;
  osAdd: number | string | null;
  pdDistance: number | string | null;
  pdNear: number | string | null;
  pdRight: number | string | null;
  pdLeft: number | string | null;
  uploadedFileUrl: string | null;
  isManualEntry: boolean;
  isVerified: boolean;
  staffNotes: string | null;
  guestEmail: string | null;
  customer: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  order: {
    orderNumber: string;
  } | null;
  createdAt: string;
}

export function PrescriptionsClient({ initialPrescriptions }: { initialPrescriptions: Prescription[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [staffNotes, setStaffNotes] = useState("");

  const activeTab = searchParams.get("verified") || "all";
  const searchQuery = searchParams.get("q") || "";

  function updateParams(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/dashboard/prescriptions?${params.toString()}`);
  }

  async function handleVerify(id: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: true, staffNotes }),
      });

      if (!res.ok) throw new Error("Failed to verify");

      toast.success("Prescription verified");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNotes(id: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffNotes }),
      });

      if (!res.ok) throw new Error("Failed to save notes");

      toast.success("Notes saved");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Tabs value={activeTab} onValueChange={(v) => updateParams("verified", v === "all" ? null : v)}>
          <TabsList className="rounded-2xl">
            <TabsTrigger value="all" className="rounded-xl">All</TabsTrigger>
            <TabsTrigger value="false" className="rounded-xl">Pending</TabsTrigger>
            <TabsTrigger value="true" className="rounded-xl">Verified</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search prescriptions..." 
            className="pl-9 rounded-2xl" 
            defaultValue={searchQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams("q", e.currentTarget.value);
            }}
          />
        </div>
      </div>

      <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPrescriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No prescriptions found.
                </TableCell>
              </TableRow>
            ) : (
              initialPrescriptions.map((rx) => (
                <TableRow key={rx.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{rx.customer?.name || "Guest"}</p>
                        <p className="text-xs text-muted-foreground">{rx.customer?.email || rx.guestEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(rx.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full font-normal">
                      {rx.isManualEntry ? "Manual Entry" : "File Upload"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rx.isVerified ? "outline-green" : "outline-amber"} className="rounded-full">
                      {rx.isVerified ? "Verified" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Sheet onOpenChange={(open) => {
                      if (open) setStaffNotes(rx.staffNotes || "");
                    }}>
                      <SheetTrigger>
                        <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="sm:max-w-xl overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>Prescription Details</SheetTitle>
                          <SheetDescription>
                            Submitted on {format(new Date(rx.createdAt), "PPP")}
                          </SheetDescription>
                        </SheetHeader>

                        <div className="mt-8 space-y-8">
                          {/* Customer Info */}
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <User className="h-4 w-4" /> Customer Information
                            </h3>
                            <div className="bg-muted/30 p-4 rounded-2xl space-y-2">
                              <p className="text-sm"><strong>Name:</strong> {rx.customer?.name || "Guest"}</p>
                              <p className="text-sm"><strong>Email:</strong> {rx.customer?.email || rx.guestEmail}</p>
                              {rx.order && (
                                <p className="text-sm"><strong>Linked Order:</strong> #{rx.order.orderNumber}</p>
                              )}
                            </div>
                          </div>

                          {/* Prescription Data */}
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <FileText className="h-4 w-4" /> Prescription Data
                            </h3>
                            {rx.isManualEntry ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded-2xl space-y-2">
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Right Eye (OD)</p>
                                  <div className="grid grid-cols-2 text-sm gap-y-1">
                                    <span>SPH: {rx.odSphere ?? "—"}</span>
                                    <span>CYL: {rx.odCylinder ?? "—"}</span>
                                    <span>AXIS: {rx.odAxis ?? "—"}</span>
                                    <span>ADD: {rx.odAdd ?? "—"}</span>
                                  </div>
                                </div>
                                <div className="p-4 border rounded-2xl space-y-2">
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Left Eye (OS)</p>
                                  <div className="grid grid-cols-2 text-sm gap-y-1">
                                    <span>SPH: {rx.osSphere ?? "—"}</span>
                                    <span>CYL: {rx.osCylinder ?? "—"}</span>
                                    <span>AXIS: {rx.osAxis ?? "—"}</span>
                                    <span>ADD: {rx.osAdd ?? "—"}</span>
                                  </div>
                                </div>
                                <div className="col-span-2 p-4 border rounded-2xl grid grid-cols-4 text-sm">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">PD Dist</p>
                                    <p>{rx.pdDistance ?? "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">PD Near</p>
                                    <p>{rx.pdNear ?? "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">PD Right</p>
                                    <p>{rx.pdRight ?? "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">PD Left</p>
                                    <p>{rx.pdLeft ?? "—"}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-2xl">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <div>
                                      <p className="text-sm font-medium">Prescription File</p>
                                      <p className="text-xs text-muted-foreground">Uploaded by customer</p>
                                    </div>
                                  </div>
                                  <Link href={rx.uploadedFileUrl!} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="rounded-full">
                                      <ExternalLink className="h-4 w-4 mr-2" /> View File
                                    </Button>
                                  </Link>
                                </div>
                                {rx.uploadedFileUrl?.match(/\.(jpg|jpeg|png|webp)$/i) && (
                                  <div className="border rounded-2xl overflow-hidden bg-muted/20 relative aspect-video">
                                    <Image 
                                      src={rx.uploadedFileUrl} 
                                      alt="Prescription" 
                                      fill 
                                      className="object-contain" 
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Verification Actions */}
                          <div className="space-y-4 border-t pt-8">
                            <div className="space-y-2">
                              <label className="text-sm font-semibold">Staff Notes</label>
                              <Textarea 
                                placeholder="Add internal notes about this prescription..."
                                value={staffNotes}
                                onChange={(e) => setStaffNotes(e.target.value)}
                                className="rounded-2xl min-h-[100px]"
                              />
                            </div>
                            
                            <div className="flex gap-3">
                              <Button 
                                className="flex-1 rounded-2xl" 
                                variant="outline"
                                onClick={() => handleSaveNotes(rx.id)}
                                disabled={loading}
                              >
                                Save Notes
                              </Button>
                              {!rx.isVerified && (
                                <Button 
                                  className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleVerify(rx.id)}
                                  disabled={loading}
                                >
                                  Verify Prescription
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
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
