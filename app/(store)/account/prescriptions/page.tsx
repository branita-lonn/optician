// app/(store)/account/prescriptions/page.tsx
// Customer account: view and manage their saved prescriptions.

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrescriptionsClient } from "@/components/store/account-prescriptions-client";

export const metadata = { title: "My Prescriptions" };

export default async function PrescriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const prescriptions = await prisma.prescription.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Serialize Decimal fields
  const serialized = prescriptions.map((p) => ({
    ...p,
    odSphere: p.odSphere ? Number(p.odSphere) : null,
    odCylinder: p.odCylinder ? Number(p.odCylinder) : null,
    odAxis: p.odAxis,
    odAdd: p.odAdd ? Number(p.odAdd) : null,
    osSphere: p.osSphere ? Number(p.osSphere) : null,
    osCylinder: p.osCylinder ? Number(p.osCylinder) : null,
    osAxis: p.osAxis,
    osAdd: p.osAdd ? Number(p.osAdd) : null,
    pdDistance: p.pdDistance ? Number(p.pdDistance) : null,
    pdNear: p.pdNear ? Number(p.pdNear) : null,
    pdRight: p.pdRight ? Number(p.pdRight) : null,
    pdLeft: p.pdLeft ? Number(p.pdLeft) : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    verifiedAt: p.verifiedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Prescriptions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your saved prescriptions. Verified prescriptions can be used when ordering prescription glasses.
        </p>
      </div>
      <PrescriptionsClient prescriptions={serialized} />
    </div>
  );
}
