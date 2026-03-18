-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ORGANIZER', 'CO_ORGANIZER', 'GUEST_PREVIEW', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'ESSENTIEL', 'PREMIUM', 'ENTREPRISE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MARIAGE', 'ANNIVERSAIRE', 'DEUIL', 'BAPTEME', 'CONFERENCE', 'PRIVE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'SEMI_PRIVATE', 'PRIVATE', 'PASSWORD');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('INVITED', 'SEEN', 'CONFIRMED', 'DECLINED', 'ABSENT');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('MOD_INVITE', 'MOD_RSVP', 'MOD_MENU', 'MOD_QR', 'MOD_LOGISTIQUE', 'MOD_CHAT', 'MOD_PROGRAMME', 'MOD_GALERIE', 'MOD_DASHBOARD');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('VALID', 'ALREADY_SCANNED', 'INVALID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'REACTION');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ORGANIZER',
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "emailVerified" TIMESTAMP(3),
    "isDemoAccount" BOOLEAN NOT NULL DEFAULT false,
    "demoAccountType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "description" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'SEMI_PRIVATE',
    "password" TEXT,
    "maxGuests" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_themes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "preset" TEXT NOT NULL DEFAULT 'mariage',
    "entryEffect" TEXT NOT NULL DEFAULT 'fade_white',
    "ambientEffect" TEXT,
    "ambientIntensity" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "scrollReveal" TEXT NOT NULL DEFAULT 'fade_up',
    "cursorEffect" TEXT,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "soundUrl" TEXT,
    "colorPrimary" TEXT NOT NULL DEFAULT '#8B5A6A',
    "colorSecondary" TEXT NOT NULL DEFAULT '#C48B90',
    "colorAccent" TEXT NOT NULL DEFAULT '#C9A96E',
    "colorBackground" TEXT NOT NULL DEFAULT '#FFFDF9',
    "colorText" TEXT NOT NULL DEFAULT '#3D2428',
    "colorSurface" TEXT NOT NULL DEFAULT '#FFFFFF',
    "colorMuted" TEXT NOT NULL DEFAULT '#9B8A8E',
    "colorBorder" TEXT NOT NULL DEFAULT '#E8DDD5',
    "fontDisplay" TEXT NOT NULL DEFAULT 'Cormorant Garamond',
    "fontBody" TEXT NOT NULL DEFAULT 'Montserrat',

    CONSTRAINT "event_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_modules" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "ModuleType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "configJson" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "event_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "group" TEXT,
    "status" "GuestStatus" NOT NULL DEFAULT 'INVITED',
    "qrToken" TEXT,
    "qrExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvps" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "presence" BOOLEAN NOT NULL,
    "adultCount" INTEGER NOT NULL DEFAULT 1,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "menuChoice" TEXT,
    "allergies" TEXT[],
    "message" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_scans" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedBy" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL,

    CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'general',
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "targetId" TEXT,
    "targetType" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_config" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "newRegistrations" BOOLEAN NOT NULL DEFAULT true,
    "demoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxEventsPerUser" JSONB NOT NULL DEFAULT '{"FREE":1,"ESSENTIEL":3,"PREMIUM":-1,"ENTREPRISE":-1}',
    "maxGuestsPerEvent" JSONB NOT NULL DEFAULT '{"FREE":50,"ESSENTIEL":200,"PREMIUM":1000,"ENTREPRISE":-1}',
    "featureFlags" JSONB NOT NULL DEFAULT '{"ENABLE_QR_SCAN":true,"ENABLE_CHAT":true,"ENABLE_GALLERY_UPLOAD":true,"ENABLE_DEMO_AUTO_LOGIN":true,"ENABLE_AI_SUGGESTIONS":false,"ENABLE_STRIPE":false,"MAINTENANCE_MODE":false}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "global_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abuse_reports" (
    "id" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "otp_codes_phone_code_idx" ON "otp_codes"("phone", "code");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_userId_idx" ON "events"("userId");

-- CreateIndex
CREATE INDEX "events_slug_idx" ON "events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "event_themes_eventId_key" ON "event_themes"("eventId");

-- CreateIndex
CREATE INDEX "event_modules_eventId_idx" ON "event_modules"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_modules_eventId_type_key" ON "event_modules"("eventId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "guests_qrToken_key" ON "guests"("qrToken");

-- CreateIndex
CREATE INDEX "guests_eventId_idx" ON "guests"("eventId");

-- CreateIndex
CREATE INDEX "guests_email_idx" ON "guests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rsvps_guestId_key" ON "rsvps"("guestId");

-- CreateIndex
CREATE INDEX "qr_scans_guestId_idx" ON "qr_scans"("guestId");

-- CreateIndex
CREATE INDEX "qr_scans_eventId_idx" ON "qr_scans"("eventId");

-- CreateIndex
CREATE INDEX "chat_messages_eventId_channel_idx" ON "chat_messages"("eventId", "channel");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "system_logs_level_category_createdAt_idx" ON "system_logs"("level", "category", "createdAt");

-- CreateIndex
CREATE INDEX "system_logs_actorId_idx" ON "system_logs"("actorId");

-- CreateIndex
CREATE INDEX "abuse_reports_status_idx" ON "abuse_reports"("status");

-- CreateIndex
CREATE INDEX "abuse_reports_targetId_idx" ON "abuse_reports"("targetId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_themes" ADD CONSTRAINT "event_themes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_modules" ADD CONSTRAINT "event_modules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
