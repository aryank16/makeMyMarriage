-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('BRIDE', 'GROOM', 'SHARED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'COUPLE', 'PARENT', 'PLANNER', 'COORDINATOR', 'CONTRIBUTOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('ROKA', 'ENGAGEMENT', 'MEHENDI', 'HALDI', 'SANGEET', 'BARAAT', 'WEDDING', 'VIDAAI', 'RECEPTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'YES', 'NO', 'MAYBE');

-- CreateEnum
CREATE TYPE "RsvpSource" AS ENUM ('GUEST', 'MANUAL');

-- CreateEnum
CREATE TYPE "DietaryPreference" AS ENUM ('UNKNOWN', 'VEG', 'NON_VEG', 'JAIN', 'VEGAN', 'NO_ONION_GARLIC', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('VENUE', 'CATERING', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'DECOR', 'MAKEUP', 'MEHENDI_ARTIST', 'PANDIT', 'MUSIC', 'TRANSPORT', 'INVITATIONS', 'TROUSSEAU', 'JEWELLERY', 'CHOREOGRAPHER', 'ACCOMMODATION', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('SHORTLISTED', 'NEGOTIATING', 'BOOKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('DUE', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WebsitePrivacy" AS ENUM ('TOKEN_GATED', 'PASSPHRASE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('LINK', 'EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wedding" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brideName" TEXT NOT NULL,
    "groomName" TEXT NOT NULL,
    "weddingDate" TIMESTAMP(3),
    "primaryCity" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "plannedTotal" BIGINT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "side" "Side" NOT NULL DEFAULT 'SHARED',
    "permissions" JSONB NOT NULL,
    "sharesBudget" BOOLEAN NOT NULL DEFAULT false,
    "invitedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "venueName" TEXT,
    "venueAddress" TEXT,
    "venueCity" TEXT,
    "venueMapUrl" TEXT,
    "hostSide" "Side" NOT NULL DEFAULT 'SHARED',
    "dressCode" TEXT,
    "expectedCount" INTEGER,
    "attendanceFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "publicOnWebsite" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "side" "Side" NOT NULL,
    "relationship" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "dietary" "DietaryPreference" NOT NULL DEFAULT 'UNKNOWN',
    "allergyNotes" TEXT,
    "accessibilityNotes" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "isPlusOne" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "source" "RsvpSource" NOT NULL DEFAULT 'GUEST',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyText" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationEvent" (
    "invitationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "InvitationEvent_pkey" PRIMARY KEY ("invitationId","eventId")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "invitationId" TEXT,
    "guestId" TEXT,
    "channel" "Channel" NOT NULL,
    "templateKey" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerId" TEXT,
    "costPaise" BIGINT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "side" "Side" NOT NULL DEFAULT 'SHARED',
    "status" "VendorStatus" NOT NULL DEFAULT 'SHORTLISTED',
    "agreedTotal" BIGINT,
    "contractUrl" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorEvent" (
    "vendorId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "VendorEvent_pkey" PRIMARY KEY ("vendorId","eventId")
);

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "side" "Side" NOT NULL DEFAULT 'SHARED',
    "plannedAmount" BIGINT NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "vendorId" TEXT,
    "description" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "side" "Side" NOT NULL DEFAULT 'SHARED',
    "paidByUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "method" "PaymentMethod",
    "receiptUrl" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'DUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "offsetDays" INTEGER,
    "dueDateOverridden" BOOLEAN NOT NULL DEFAULT false,
    "templateKey" TEXT,
    "eventId" TEXT,
    "vendorId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "eventId" TEXT,
    "householdId" TEXT,
    "uploadedByUserId" TEXT,
    "storagePath" TEXT NOT NULL,
    "renditionPath" TEXT,
    "thumbnailPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "capturedAt" TIMESTAMP(3),
    "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING',
    "reportedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'classic',
    "privacy" "WebsitePrivacy" NOT NULL DEFAULT 'TOKEN_GATED',
    "passphraseHash" TEXT,
    "sections" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TaskAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskAssignees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_slug_key" ON "Wedding"("slug");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_weddingId_userId_key" ON "Membership"("weddingId", "userId");

-- CreateIndex
CREATE INDEX "Event_weddingId_startAt_idx" ON "Event"("weddingId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Household_inviteToken_key" ON "Household"("inviteToken");

-- CreateIndex
CREATE INDEX "Household_weddingId_idx" ON "Household"("weddingId");

-- CreateIndex
CREATE INDEX "Guest_weddingId_side_idx" ON "Guest"("weddingId", "side");

-- CreateIndex
CREATE INDEX "Guest_weddingId_phone_idx" ON "Guest"("weddingId", "phone");

-- CreateIndex
CREATE INDEX "Rsvp_weddingId_eventId_status_idx" ON "Rsvp"("weddingId", "eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_guestId_eventId_key" ON "Rsvp"("guestId", "eventId");

-- CreateIndex
CREATE INDEX "Invitation_weddingId_idx" ON "Invitation"("weddingId");

-- CreateIndex
CREATE INDEX "MessageLog_weddingId_channel_createdAt_idx" ON "MessageLog"("weddingId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "Vendor_weddingId_category_idx" ON "Vendor"("weddingId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategory_weddingId_name_key" ON "BudgetCategory"("weddingId", "name");

-- CreateIndex
CREATE INDEX "Payment_weddingId_status_dueDate_idx" ON "Payment"("weddingId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Task_weddingId_status_dueDate_idx" ON "Task"("weddingId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Photo_weddingId_status_capturedAt_idx" ON "Photo"("weddingId", "status", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Website_weddingId_key" ON "Website"("weddingId");

-- CreateIndex
CREATE INDEX "AuditLog_weddingId_createdAt_idx" ON "AuditLog"("weddingId", "createdAt");

-- CreateIndex
CREATE INDEX "_TaskAssignees_B_index" ON "_TaskAssignees"("B");

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationEvent" ADD CONSTRAINT "InvitationEvent_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationEvent" ADD CONSTRAINT "InvitationEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvent" ADD CONSTRAINT "VendorEvent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvent" ADD CONSTRAINT "VendorEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskAssignees" ADD CONSTRAINT "_TaskAssignees_A_fkey" FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskAssignees" ADD CONSTRAINT "_TaskAssignees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
