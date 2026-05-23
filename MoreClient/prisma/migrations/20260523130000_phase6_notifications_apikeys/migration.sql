-- Phase 6: in-app notifications, third-party API keys, and email/digest opt-out preferences.

-- AlterTable: notification preferences on principals
ALTER TABLE "Company" ADD COLUMN "notifyEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN "notifyDigest" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Talent" ADD COLUMN "notifyEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Talent" ADD COLUMN "notifyDigest" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "principalType" "PrincipalType" NOT NULL,
    "principalId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorType" "SenderType",
    "actorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "linkUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_principalType_principalId_createdAt_idx" ON "Notification"("principalType", "principalId", "createdAt" DESC);
CREATE INDEX "Notification_principalType_principalId_readAt_idx" ON "Notification"("principalType", "principalId", "readAt");

-- CreateTable: ApiKey
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "principalType" "PrincipalType" NOT NULL,
    "principalId" UUID NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
CREATE INDEX "ApiKey_principalType_principalId_idx" ON "ApiKey"("principalType", "principalId");
