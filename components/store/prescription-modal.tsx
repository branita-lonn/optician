// components/store/prescription-modal.tsx
// Customer prescription submission modal: manual entry OR file upload.

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Upload, X, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const eyeFieldSchema = z.object({
  sphere: z.coerce.number().min(-30).max(30).optional().nullable(),
  cylinder: z.coerce.number().min(-10).max(10).optional().nullable(),
  axis: z.coerce.number().int().min(0).max(180).optional().nullable(),
  add: z.coerce.number().min(0).max(4).optional().nullable(),
});

const manualSchema = z.object({
  od: eyeFieldSchema,
  os: eyeFieldSchema,
  pdDistance: z.coerce.number().min(40).max(80).optional().nullable(),
  pdNear: z.coerce.number().min(40).max(80).optional().nullable(),
  pdRight: z.coerce.number().min(20).max(45).optional().nullable(),
  pdLeft: z.coerce.number().min(20).max(45).optional().nullable(),
  notes: z.string().max(500).optional(),
});

type ManualFormValues = z.infer<typeof manualSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (prescriptionId: string) => void;
  guestEmail?: string; // required for guest checkout
}

// ─── Reusable eye form block ──────────────────────────────────────────────────

function EyeFields({
  prefix,
  label,
  form,
  loading,
}: {
  prefix: "od" | "os";
  label: string;
  form: any;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["sphere", "cylinder", "axis", "add"] as const).map((field) => (
          <FormField
            key={field}
            control={form.control}
            name={`${prefix}.${field}`}
            render={({ field: f }: any) => (
              <FormItem>
                <FormLabel className="text-xs capitalize">{field === "add" ? "ADD" : field.charAt(0).toUpperCase() + field.slice(1)}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step={field === "axis" ? "1" : "0.25"}
                    disabled={loading}
                    placeholder={field === "axis" ? "0–180" : "0.00"}
                    {...f}
                    value={f.value ?? ""}
                    onChange={(e) =>
                      f.onChange(e.target.value === "" ? null : e.target.value)
                    }
                    className="rounded-xl h-9 text-sm"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PrescriptionModal({
  open,
  onClose,
  onSuccess,
  guestEmail,
}: PrescriptionModalProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    publicId: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<ManualFormValues>({
    resolver: zodResolver(manualSchema) as any,
    defaultValues: {
      od: { sphere: null, cylinder: null, axis: null, add: null },
      os: { sphere: null, cylinder: null, axis: null, add: null },
      pdDistance: null,
      pdNear: null,
      pdRight: null,
      pdLeft: null,
      notes: "",
    },
  });

  // ─── File upload handler ────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, or PDF files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "miduka/prescriptions");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json() as { url: string; publicId: string };
      setUploadedFile({ url: data.url, publicId: data.publicId, name: file.name });
      toast.success("File uploaded successfully");
    } catch {
      toast.error("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // ─── Submit manual entry ────────────────────────────────────────────────────

  async function onSubmitManual(values: ManualFormValues) {
    try {
      setLoading(true);
      const payload = {
        odSphere: values.od.sphere,
        odCylinder: values.od.cylinder,
        odAxis: values.od.axis,
        odAdd: values.od.add,
        osSphere: values.os.sphere,
        osCylinder: values.os.cylinder,
        osAxis: values.os.axis,
        osAdd: values.os.add,
        pdDistance: values.pdDistance,
        pdNear: values.pdNear,
        pdRight: values.pdRight,
        pdLeft: values.pdLeft,
        notes: values.notes,
        isManualEntry: true,
        guestEmail: guestEmail ?? undefined,
      };

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Failed to save prescription");
      }

      const data = await res.json() as { prescriptionId: string };
      setSuccess(true);
      toast.success("Prescription saved successfully");
      setTimeout(() => {
        onSuccess(data.prescriptionId);
        onClose();
        setSuccess(false);
        form.reset();
      }, 1200);
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ─── Submit file upload ─────────────────────────────────────────────────────

  async function onSubmitUpload() {
    if (!uploadedFile) {
      toast.error("Please upload your prescription file first.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        uploadedFileUrl: uploadedFile.url,
        uploadedFilePublicId: uploadedFile.publicId,
        isManualEntry: false,
        guestEmail: guestEmail ?? undefined,
      };

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Failed to save prescription");
      }

      const data = await res.json() as { prescriptionId: string };
      setSuccess(true);
      toast.success("Prescription submitted successfully");
      setTimeout(() => {
        onSuccess(data.prescriptionId);
        onClose();
        setSuccess(false);
        setUploadedFile(null);
      }, 1200);
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ─── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h3 className="text-xl font-bold">Prescription Saved</h3>
            <p className="text-sm text-muted-foreground">
              Your prescription has been saved and our team will verify it shortly.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Main modal ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Submit Your Prescription</DialogTitle>
          <DialogDescription>
            Enter your prescription details manually or upload a photo/PDF of your prescription.
            Our opticians will review and verify it.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "upload")}>
          <TabsList className="grid grid-cols-2 rounded-2xl w-full">
            <TabsTrigger value="manual" className="rounded-xl">Enter Manually</TabsTrigger>
            <TabsTrigger value="upload" className="rounded-xl">Upload File</TabsTrigger>
          </TabsList>

          {/* ── Manual Entry Tab ── */}
          <TabsContent value="manual" className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitManual)} className="space-y-6">

                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
                  Enter your prescription exactly as written on your prescription card.
                  The values are on the card as SPH (sphere), CYL (cylinder), AXIS, and ADD.
                  Negative values (e.g. –2.00) indicate short-sightedness.
                </div>

                <EyeFields prefix="od" label="Right Eye (OD)" form={form} loading={loading} />
                <EyeFields prefix="os" label="Left Eye (OS)" form={form} loading={loading} />

                {/* PD */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Pupillary Distance (PD)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control as any}
                      name="pdDistance"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel className="text-xs">PD Distance (mm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number" step="0.5" disabled={loading}
                              placeholder="e.g. 64"
                              {...field} value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                              className="rounded-xl h-9 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="pdNear"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel className="text-xs">PD Near (mm) — optional</FormLabel>
                          <FormControl>
                            <Input
                              type="number" step="0.5" disabled={loading}
                              placeholder="e.g. 61"
                              {...field} value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                              className="rounded-xl h-9 text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control as any}
                      name="pdRight"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel className="text-xs">PD Right (mm) — optional</FormLabel>
                          <FormControl>
                            <Input
                              type="number" step="0.5" disabled={loading}
                              placeholder="e.g. 32"
                              {...field} value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                              className="rounded-xl h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="pdLeft"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel className="text-xs">PD Left (mm) — optional</FormLabel>
                          <FormControl>
                            <Input
                              type="number" step="0.5" disabled={loading}
                              placeholder="e.g. 32"
                              {...field} value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                              className="rounded-xl h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Notes */}
                <FormField
                  control={form.control as any}
                  name="notes"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel className="text-xs">Additional Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={loading}
                          placeholder="E.g. 'Reading glasses only' or 'Distance and near'"
                          className="rounded-xl text-sm resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl gap-2"
                  size="lg"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Prescription
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* ── Upload Tab ── */}
          <TabsContent value="upload" className="mt-6 space-y-5">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
              Upload a clear photo or PDF of your prescription card. Accepted formats: JPG, PNG, WEBP, PDF. Max 10MB.
              Our team will manually verify the details.
            </div>

            {/* Drop zone */}
            <label
              className={cn(
                "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-colors",
                uploading
                  ? "border-primary/40 bg-primary/5 cursor-wait"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : uploadedFile ? (
                <FileText className="h-8 w-8 text-emerald-500" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {uploading
                    ? "Uploading…"
                    : uploadedFile
                    ? uploadedFile.name
                    : "Click to upload or drag and drop"}
                </p>
                {!uploadedFile && !uploading && (
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, PDF up to 10MB</p>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>

            {uploadedFile && (
              <button
                type="button"
                onClick={() => setUploadedFile(null)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
                Remove file
              </button>
            )}

            <Button
              type="button"
              onClick={onSubmitUpload}
              disabled={loading || uploading || !uploadedFile}
              className="w-full rounded-2xl gap-2"
              size="lg"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Prescription
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
