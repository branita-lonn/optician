// components/store/lens-configurator-modal.tsx
// Multi-step lens configuration modal for optician products.

"use client";

import { useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, Eye, Layers, Shield, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PrescriptionModal } from "@/components/store/prescription-modal";
import type { PrescriptionPublic } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LensConfig {
  needsPrescription: boolean;
  lensType: string;           // "Non-Prescription" | "Single Vision" | "Bifocal" | "Progressive" | "Reading"
  lensCoating: string;        // "Standard" | "Anti-Glare" | "UV400" | "Blue Light Block" | "Photochromic"
  prescriptionId: string | null;
  prescriptionSource: "saved" | "new" | "later" | "none";
}

interface LensConfiguratorModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: LensConfig) => Promise<void>;
  productName: string;
  isRxRequired: boolean;                     // Product-level: always requires Rx
  savedPrescriptions: PrescriptionPublic[];   // Customer's saved prescriptions
  guestEmail?: string;
  isLoggedIn: boolean;
}

// ─── Option card ──────────────────────────────────────────────────────────────

function OptionCard({
  label,
  description,
  selected,
  onClick,
  icon,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border-2 px-4 py-4 transition-all duration-200 flex items-start gap-3",
        selected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      {icon && (
        <div className={cn("mt-0.5 shrink-0", selected ? "text-primary" : "text-muted-foreground")}>
          {icon}
        </div>
      )}
      <div className="flex-1">
        <p className={cn("text-sm font-semibold", selected && "text-primary")}>{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {selected && <CheckCircle2 className="ml-auto h-4 w-4 text-primary shrink-0 mt-0.5" />}
    </button>
  );
}

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === current ? "w-6 bg-primary" : i < current ? "w-3 bg-primary/40" : "w-3 bg-muted"
          )}
        />
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function LensConfiguratorModal({
  open,
  onClose,
  onConfirm,
  productName,
  isRxRequired,
  savedPrescriptions,
  guestEmail,
  // isLoggedIn, // Still used for logic if needed
}: LensConfiguratorModalProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<LensConfig>({
    needsPrescription: isRxRequired,
    lensType: isRxRequired ? "Single Vision" : "Non-Prescription",
    lensCoating: "Standard",
    prescriptionId: null,
    prescriptionSource: "none",
  });
  const [confirming, setConfirming] = useState(false);
  const [rxModalOpen, setRxModalOpen] = useState(false);

  // Determine steps based on whether Rx is required
  // If isRxRequired: skip step 1 (already decided), go straight to lens type
  const steps = isRxRequired
    ? ["Lens Type", "Lens Coating", "Prescription", "Confirm"]
    : ["Lens Purpose", "Lens Type", "Lens Coating", "Prescription", "Confirm"];

  const totalSteps = steps.length;

  // ─── Step resolvers ──────────────────────────────────────────────────────────

  // Step index in the dynamic steps array
  const getStepLabel = () => steps[step] ?? "";

  const canAdvance = (): boolean => {
    const label = getStepLabel();
    if (label === "Lens Purpose") return true; // always has a selection
    if (label === "Lens Type") return !!config.lensType;
    if (label === "Lens Coating") return !!config.lensCoating;
    if (label === "Prescription") {
      if (!config.needsPrescription) return true; // Non-Rx: skip
      return config.prescriptionSource !== "none";
    }
    return true;
  };

  const advance = () => {
    // If user chose Non-Prescription lens type, skip Coating and Prescription steps
    if (getStepLabel() === "Lens Type" && config.lensType === "Non-Prescription") {
      const confirmIndex = steps.indexOf("Confirm");
      setStep(confirmIndex);
      return;
    }
    
    // Standard advance
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  // ─── Confirm ─────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await onConfirm(config);
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add to cart");
    } finally {
      setConfirming(false);
    }
  };

  // ─── Prescription saved callback ─────────────────────────────────────────────

  const handleNewPrescriptionSaved = (prescriptionId: string) => {
    setConfig((c) => ({ ...c, prescriptionId, prescriptionSource: "new" }));
    setRxModalOpen(false);
  };

  // ─── Render steps ─────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg rounded-3xl overflow-hidden p-0 gap-0">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold">Configure Your Lenses</DialogTitle>
              <DialogDescription className="truncate font-medium">
                {productName}
              </DialogDescription>
            </DialogHeader>

            <StepDots total={totalSteps} current={step} />

            <div className="min-h-[280px] py-2">

              {/* ── STEP: Lens Purpose ── */}
              {getStepLabel() === "Lens Purpose" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Do you need prescription lenses?</p>
                  <OptionCard
                    label="Yes — I have a prescription"
                    description="We'll add your Rx to these frames"
                    selected={config.needsPrescription}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        needsPrescription: true,
                        lensType: "Single Vision",
                        prescriptionSource: "none",
                      }))
                    }
                    icon={<Eye className="h-5 w-5" />}
                  />
                  <OptionCard
                    label="No — Non-prescription / Fashion only"
                    description="Clear or tinted lenses with no Rx"
                    selected={!config.needsPrescription}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        needsPrescription: false,
                        lensType: "Non-Prescription",
                        prescriptionId: null,
                        prescriptionSource: "none",
                      }))
                    }
                    icon={<Layers className="h-5 w-5" />}
                  />
                </div>
              )}

              {/* ── STEP: Lens Type ── */}
              {getStepLabel() === "Lens Type" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Select lens type</p>
                  {(config.needsPrescription
                    ? [
                        { value: "Single Vision", desc: "One focal point — for distance or near" },
                        { value: "Bifocal", desc: "Two focal points — distance and near" },
                        { value: "Progressive", desc: "Seamless transition from distance to near" },
                        { value: "Reading", desc: "Optimised for close-up reading" },
                      ]
                    : [{ value: "Non-Prescription", desc: "Clear or tinted — no Rx needed" }]
                  ).map((opt) => (
                    <OptionCard
                      key={opt.value}
                      label={opt.value}
                      description={opt.desc}
                      selected={config.lensType === opt.value}
                      onClick={() => setConfig((c) => ({ ...c, lensType: opt.value }))}
                    />
                  ))}
                </div>
              )}

              {/* ── STEP: Lens Coating ── */}
              {getStepLabel() === "Lens Coating" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Select lens coating</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: "Standard", desc: "Basic clear lens — no special coating" },
                      { value: "Anti-Glare", desc: "Reduces reflections from screens and lights" },
                      { value: "UV400", desc: "Full UV protection from the sun" },
                      { value: "Blue Light Block", desc: "Filters blue light from screens" },
                      { value: "Photochromic", desc: "Darkens in sunlight, clears indoors (Transitions®)" },
                      { value: "Anti-Glare + UV400", desc: "Best of both — glare reduction and UV protection" },
                    ].map((opt) => (
                      <OptionCard
                        key={opt.value}
                        label={opt.value}
                        description={opt.desc}
                        selected={config.lensCoating === opt.value}
                        onClick={() => setConfig((c) => ({ ...c, lensCoating: opt.value }))}
                        icon={<Shield className="h-4 w-4" />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP: Prescription ── */}
              {getStepLabel() === "Prescription" && config.needsPrescription && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Attach your prescription</p>

                  {/* Saved prescriptions */}
                  {savedPrescriptions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest px-1">Saved Prescriptions</p>
                      <div className="space-y-2">
                        {savedPrescriptions.map((rx) => (
                          <OptionCard
                            key={rx.id}
                            label={`Prescription from ${new Date(rx.createdAt).toLocaleDateString("en-KE")}`}
                            description={`OD: ${rx.odSphere ?? "—"} / ${rx.odCylinder ?? "—"} · OS: ${rx.osSphere ?? "—"} / ${rx.osCylinder ?? "—"}${rx.isVerified ? " · ✓ Verified" : " · Pending verification"}`}
                            selected={config.prescriptionId === rx.id}
                            onClick={() =>
                              setConfig((c) => ({
                                ...c,
                                prescriptionId: rx.id,
                                prescriptionSource: "saved",
                              }))
                            }
                            icon={<ClipboardList className="h-4 w-4" />}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit new */}
                  <div className="space-y-2">
                    {savedPrescriptions.length > 0 && (
                      <div className="flex items-center gap-2 px-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Or</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setRxModalOpen(true)}
                      className={cn(
                        "w-full text-left rounded-2xl border-2 px-4 py-4 transition-all duration-200",
                        config.prescriptionSource === "new"
                          ? "border-primary bg-primary/10"
                          : "border-dashed border-border hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <p className="text-sm font-semibold text-primary">
                        {config.prescriptionSource === "new"
                          ? "✓ New prescription submitted"
                          : "+ Submit a new prescription"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enter values manually or upload a photo/PDF
                      </p>
                    </button>
                  </div>

                  {/* Provide later */}
                  <OptionCard
                    label="I'll provide my prescription later"
                    description="We'll hold your order. Our team will follow up before processing."
                    selected={config.prescriptionSource === "later"}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        prescriptionId: null,
                        prescriptionSource: "later",
                      }))
                    }
                  />
                </div>
              )}

              {/* ── STEP: Confirm ── */}
              {getStepLabel() === "Confirm" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <p className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Review your lens configuration</p>
                  <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                    {[
                      { label: "Lens Type", value: config.lensType },
                      { label: "Coating", value: config.lensCoating },
                      {
                        label: "Prescription",
                        value:
                          config.prescriptionSource === "saved"
                            ? "Using saved prescription"
                            : config.prescriptionSource === "new"
                            ? "New prescription submitted"
                            : config.prescriptionSource === "later"
                            ? "To be provided later"
                            : "Not required",
                      },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-card">
                        <span className="text-xs text-muted-foreground font-medium">{row.label}</span>
                        <span className="text-sm font-semibold">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {config.prescriptionSource === "later" && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 leading-relaxed">
                      <strong>Note:</strong> Your order will not be processed until we receive your prescription. We'll email you within 24 hours.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Navigation ── */}
          <div className="flex items-center gap-3 p-6 bg-muted/50 border-t border-border">
            {step > 0 && (
              <Button variant="outline" onClick={back} className="rounded-xl flex-1" disabled={confirming}>
                Back
              </Button>
            )}

            {getStepLabel() === "Confirm" ? (
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="rounded-xl flex-1 gap-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add to Cart
              </Button>
            ) : (
              <Button
                onClick={advance}
                disabled={!canAdvance()}
                className="rounded-xl flex-1 gap-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested prescription submission modal */}
      <PrescriptionModal
        open={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        onSuccess={handleNewPrescriptionSaved}
        guestEmail={guestEmail}
      />
    </>
  );
}
