/*
  Warnings:

  - A unique constraint covering the columns `[prescriptionId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GENERAL', 'PRESCRIPTION_GLASSES', 'SUNGLASSES', 'CONTACT_LENSES', 'READING_GLASSES', 'ACCESSORIES');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('EYE_TEST', 'FRAME_FITTING', 'CONTACT_LENS_CONSULTATION', 'COLLECTION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "GiftCard" ADD COLUMN     "mpesaCheckoutRequestId" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "recipientEmail" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "senderName" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "lensConfigJson" TEXT,
ADD COLUMN     "prescriptionId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "frameMeasurements" TEXT,
ADD COLUMN     "isRxRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "tryOnImageUrl" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "frameSize" TEXT,
ADD COLUMN     "lensCoating" TEXT,
ADD COLUMN     "lensType" TEXT,
ADD COLUMN     "prescriptionReady" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "aboutPage" TEXT,
ADD COLUMN     "contactPage" TEXT,
ADD COLUMN     "privacyPolicy" TEXT;

-- AlterTable
ALTER TABLE "hero_slides" ADD COLUMN     "verticalAlign" TEXT DEFAULT 'center',
ADD COLUMN     "videoPublicId" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "guestEmail" TEXT,
    "odSphere" DECIMAL(65,30),
    "odCylinder" DECIMAL(65,30),
    "odAxis" INTEGER,
    "odAdd" DECIMAL(65,30),
    "osSphere" DECIMAL(65,30),
    "osCylinder" DECIMAL(65,30),
    "osAxis" INTEGER,
    "osAdd" DECIMAL(65,30),
    "pdDistance" DECIMAL(65,30),
    "pdNear" DECIMAL(65,30),
    "pdRight" DECIMAL(65,30),
    "pdLeft" DECIMAL(65,30),
    "uploadedFileUrl" TEXT,
    "uploadedFilePublicId" TEXT,
    "isManualEntry" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "orderId" TEXT,
    "orderItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "type" "AppointmentType" NOT NULL DEFAULT 'EYE_TEST',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "staffNotes" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "confirmationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prescription_customerId_idx" ON "Prescription"("customerId");

-- CreateIndex
CREATE INDEX "Prescription_orderId_idx" ON "Prescription"("orderId");

-- CreateIndex
CREATE INDEX "Prescription_isVerified_idx" ON "Prescription"("isVerified");

-- CreateIndex
CREATE INDEX "Appointment_scheduledDate_idx" ON "Appointment"("scheduledDate");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "GiftCard_mpesaCheckoutRequestId_idx" ON "GiftCard"("mpesaCheckoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_prescriptionId_key" ON "Order"("prescriptionId");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
