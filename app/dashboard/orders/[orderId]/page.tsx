// app/dashboard/orders/[orderId]/page.tsx
// Detailed order view for sellers with status management and printing.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { MapPin, Phone, Mail, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/orders/status-badge";
import Link from "next/link";
import { OrderStatusControl } from "@/components/dashboard/orders/order-status-control";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      shippingAddress: true,
      prescription: true,
      items: {
        include: {
          product: { select: { images: { take: 1 } } }
        }
      }
    }
  });


  if (!order) {
    notFound();
  }

  const customerName = order.customer?.name || order.guestName || "Guest";
  const customerEmail = order.customer?.email || order.guestEmail;
  const customerPhone = order.customer?.phone || order.guestPhone || order.shippingAddress.phone;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Order {order.orderNumber}</h1>
              <StatusBadge status={order.status} type="order" />
            </div>
            <p className="text-sm text-muted-foreground">
              Placed on {format(new Date(order.createdAt), "MMMM dd, yyyy 'at' HH:mm")}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <OrderStatusControl orderId={order.id} initialStatus={order.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Order Items & Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-border/50 bg-card/50 overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {order.items.map((item) => {
                  const itemLensConfig = item.lensConfigJson ? JSON.parse(item.lensConfigJson) : null;
                  
                  return (
                    <div key={item.id} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 rounded-2xl bg-muted border border-border/50 overflow-hidden shrink-0">
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground uppercase text-center p-1">
                                {item.productName}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{item.productName}</p>
                          {item.variantLabel && (
                            <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium">{formatCurrency(Number(item.unitPrice))} × {item.quantity}</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(Number(item.total))}</p>
                        </div>
                      </div>

                      {itemLensConfig && (
                        <div className="mt-3 ml-20 p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Lens Configuration</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <p className="text-xs font-medium">Type: <span className="text-muted-foreground">{itemLensConfig.lensType}</span></p>
                            <p className="text-xs font-medium">Coating: <span className="text-muted-foreground">{itemLensConfig.lensCoating}</span></p>
                            {itemLensConfig.prescriptionSource === "later" && (
                              <p className="text-xs font-bold text-amber-600">Rx to be provided later</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>


          <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden">
             <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatCurrency(Number(order.shippingCost))}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(Number(order.discountAmount))}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(Number(order.total))}</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Payment Method: {order.paymentMethod}</span>
                <StatusBadge status={order.paymentStatus} type="payment" />
              </div>
              {order.mpesaReceiptNumber && (
                <p className="text-[10px] text-muted-foreground text-right mt-1">
                  M-Pesa Receipt: {order.mpesaReceiptNumber}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer & Shipping */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <span className="text-xs font-bold">{customerName.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{customerName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {customerEmail}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" /> {customerPhone}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.prescription && (
            <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="h-5 w-5 flex items-center justify-center rounded bg-primary text-[10px] text-primary-foreground font-bold">Rx</span>
                  Prescription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Right Eye (OD)</p>
                    <div className="text-xs space-y-1">
                      <p>Sphere: <span className="font-semibold">{Number(order.prescription.odSphere) || "—"}</span></p>
                      <p>Cylinder: <span className="font-semibold">{Number(order.prescription.odCylinder) || "—"}</span></p>
                      <p>Axis: <span className="font-semibold">{order.prescription.odAxis || "—"}°</span></p>
                      {Number(order.prescription.odAdd) > 0 && <p>Add: <span className="font-semibold">{Number(order.prescription.odAdd)}</span></p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Left Eye (OS)</p>
                    <div className="text-xs space-y-1">
                      <p>Sphere: <span className="font-semibold">{Number(order.prescription.osSphere) || "—"}</span></p>
                      <p>Cylinder: <span className="font-semibold">{Number(order.prescription.osCylinder) || "—"}</span></p>
                      <p>Axis: <span className="font-semibold">{order.prescription.osAxis || "—"}°</span></p>
                      {Number(order.prescription.osAdd) > 0 && <p>Add: <span className="font-semibold">{Number(order.prescription.osAdd)}</span></p>}
                    </div>
                  </div>
                </div>

                {order.prescription.pdDistance && (
                   <div className="pt-2 border-t border-border/50">
                     <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Pupillary Distance (PD)</p>
                     <p className="text-sm font-semibold mt-1">{Number(order.prescription.pdDistance)} mm</p>
                   </div>
                )}

                <div className="pt-3 flex items-center justify-between">
                  <Link href={`/dashboard/prescriptions/${order.prescriptionId}`}>
                    <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs">
                      View Full Prescription
                    </Button>
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full", order.prescription.isVerified ? "bg-emerald-500" : "bg-amber-500")} />
                    <span className="text-[10px] font-bold uppercase">{order.prescription.isVerified ? "Verified" : "Unverified"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-1" />
                <div className="text-sm space-y-1">
                  <p className="font-bold">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.county}</p>
                  <p>{order.shippingAddress.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">Order Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm italic text-muted-foreground">&quot;{order.notes}&quot;</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Print-only View */}
      <div className="hidden print:block print:p-8 space-y-8 bg-white text-black min-h-screen">
         <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold">MiDuka</h1>
                <p className="text-sm text-gray-500">Official Receipt</p>
            </div>
            <div className="text-right">
                <h2 className="text-xl font-bold">Order #{order.orderNumber}</h2>
                <p className="text-sm text-gray-500">{format(new Date(order.createdAt), "PPP")}</p>
            </div>
         </div>

         <Separator className="border-gray-200" />

         <div className="grid grid-cols-2 gap-12">
            <div>
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Customer</h3>
                <p className="font-bold">{customerName}</p>
                <p>{customerEmail}</p>
                <p>{customerPhone}</p>
            </div>
            <div>
                <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Shipping To</h3>
                <p className="font-bold">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.county}</p>
                <p>{order.shippingAddress.phone}</p>
            </div>
         </div>

         <Table className="border border-gray-100">
            <TableHeader className="bg-gray-50">
                <TableRow>
                    <TableHead className="text-black font-bold">Item</TableHead>
                    <TableHead className="text-black font-bold text-right">Price</TableHead>
                    <TableHead className="text-black font-bold text-right">Qty</TableHead>
                    <TableHead className="text-black font-bold text-right">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {order.items.map((item) => (
                    <TableRow key={item.id} className="border-b border-gray-100">
                        <TableCell>
                            <p className="font-bold">{item.productName}</p>
                            {item.variantLabel && <p className="text-xs text-gray-500">{item.variantLabel}</p>}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(item.unitPrice))}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(Number(item.total))}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
         </Table>

         <div className="flex justify-end">
            <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>{formatCurrency(Number(order.shippingCost))}</span>
                </div>
                <Separator className="border-gray-100" />
                <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(Number(order.total))}</span>
                </div>
            </div>
         </div>

         <div className="mt-12 text-center text-xs text-gray-400 border-t border-gray-100 pt-8">
            Thank you for shopping with MiDuka. This is a computer-generated receipt.
         </div>
      </div>
    </div>
  );
}
