CREATE TABLE "SocialAuthConfiguration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "encryptedCredentials" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAuthConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialAuthConfiguration_provider_key"
ON "SocialAuthConfiguration"("provider");
