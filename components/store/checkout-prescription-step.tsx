// components/store/checkout-prescription-step.tsx
"use client";

import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface RxItem {
  productName: string;
  variantLabel?: string;
  lensConfig: {
    lensType: string;
    lensCoating: string;
    prescriptionSource: string;
    prescriptionId?: string | null;
  } | null;
}

interface CheckoutPrescriptionStepProps {
  rxItems: RxItem[];
}

export function CheckoutPrescriptionStep({ rxItems }: CheckoutPrescriptionStepProps) {
  if (rxItems.length === 0) return null;

  const allHavePrescription = rxItems.every(
    (item) =>
      !item.lensConfig ||
      item.lensConfig.prescriptionSource === "none" || // non-Rx product
      item.lensConfig.prescriptionSource === "saved" ||
      item.lensConfig.prescriptionSource === "new"
  );

  const pendingLater = rxItems.filter(
    (item) => item.lensConfig?.prescriptionSource === "later"
  );

  return (
    <div className="rounded-3xl border border-border p-6 space-y-6 bg-card">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Prescription Summary</h3>
          <p className="text-xs text-muted-foreground">Confirming lens details for your items</p>
        </div>
      </div>

      <div className="space-y-3">
        {rxItems.map((item, i) => {
          const source = item.lensConfig?.prescriptionSource;
          const isOk = source === "saved" || source === "new" || source === "none";
          // const isLater = source === "later";

          return (
            <div
              key={i}
              className={cn(
                "rounded-2xl border px-5 py-4 flex items-start gap-4 transition-all duration-200",
                isOk
                  ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10"
                  : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10"
              )}
            >
              <div className={cn(
                "mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                isOk ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600" : "bg-amber-100 dark:bg-amber-900/50 text-amber-600"
              )}>
                {isOk ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{item.productName}</p>
                {item.variantLabel && (
                  <p className="text-xs text-muted-foreground font-medium">{item.variantLabel}</p>
                )}
                {item.lensConfig && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-full">
                      {item.lensConfig.lensType}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-full">
                      {item.lensConfig.lensCoating}
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      isOk ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40" : "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40"
                    )}>
                      {source === "saved"
                        ? "Saved Rx Attached"
                        : source === "new"
                        ? "New Rx Submitted"
                        : source === "later"
                        ? "Provide Later"
                        : "No Rx Needed"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pendingLater.length > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50">
          <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
            <strong>Action Required:</strong> {pendingLater.length} item{pendingLater.length > 1 ? "s" : ""} will not be dispatched until we receive the prescription. Our team will follow up via email within 24 hours.
          </p>
        </div>
      ) : allHavePrescription ? (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
          <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
            <strong>Ready:</strong> All prescriptions are accounted for. Your order will be processed immediately after payment.
          </p>
        </div>
      ) : null}
    </div>
  );
}
