// app/dashboard/prescriptions/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrescriptionsClient } from "@/components/dashboard/prescriptions-client";

export const metadata = { title: "Prescriptions — Dashboard" };

export default async function DashboardPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; verified?: string; q?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "STORE_OWNER") {
    redirect("/auth/login");
  }

  const { page, verified, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1"));
  const limit = 20;
  const skip = (currentPage - 1) * limit;

  const where: any = {};
  if (verified === "true") where.isVerified = true;
  if (verified === "false") where.isVerified = false;
  if (q) {
    where.OR = [
      { guestEmail: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { email: { contains: q, mode: "insensitive" } } },
      { id: { contains: q, mode: "insensitive" } },
    ];
  }

  const prescriptions = await prisma.prescription.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, email: true, image: true } },
      order: { select: { orderNumber: true } },
    },
  });

  const total = await prisma.prescription.count({ where });
  const pending = await prisma.prescription.count({ where: { isVerified: false } });

  // Serialize Decimals for client
  const serialized = prescriptions.map((p) => ({
    ...p,
    odSphere: p.odSphere ? Number(p.odSphere) : null,
    odCylinder: p.odCylinder ? Number(p.odCylinder) : null,
    odAdd: p.odAdd ? Number(p.odAdd) : null,
    osSphere: p.osSphere ? Number(p.osSphere) : null,
    osCylinder: p.osCylinder ? Number(p.osCylinder) : null,
    osAdd: p.osAdd ? Number(p.osAdd) : null,
    pdDistance: p.pdDistance ? Number(p.pdDistance) : null,
    pdNear: p.pdNear ? Number(p.pdNear) : null,
    pdRight: p.pdRight ? Number(p.pdRight) : null,
    pdLeft: p.pdLeft ? Number(p.pdLeft) : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="text-sm text-muted-foreground">
            {pending} pending verification · {total} total
          </p>
        </div>
      </div>
      <PrescriptionsClient initialPrescriptions={serialized as any} />
    </div>
  );
}
