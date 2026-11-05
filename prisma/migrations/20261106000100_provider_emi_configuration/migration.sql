CREATE TABLE "EmiConfiguration" (
  "id" TEXT NOT NULL,
  "paymentGatewayId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "minimumAmount" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("minimumAmount" >= 0),
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmiConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EmiBankPlan" (
  "id" TEXT NOT NULL,
  "emiConfigurationId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "tenureMonths" INTEGER NOT NULL CHECK ("tenureMonths" BETWEEN 1 AND 99),
  "chargePercent" DOUBLE PRECISION NOT NULL CHECK ("chargePercent" BETWEEN 0 AND 100),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "EmiBankPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmiConfiguration_paymentGatewayId_key" ON "EmiConfiguration"("paymentGatewayId");
CREATE UNIQUE INDEX "EmiBankPlan_emiConfigurationId_bankName_tenureMonths_key" ON "EmiBankPlan"("emiConfigurationId", "bankName", "tenureMonths");
ALTER TABLE "EmiConfiguration" ADD CONSTRAINT "EmiConfiguration_paymentGatewayId_fkey" FOREIGN KEY ("paymentGatewayId") REFERENCES "PaymentGateway"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmiBankPlan" ADD CONSTRAINT "EmiBankPlan_emiConfigurationId_fkey" FOREIGN KEY ("emiConfigurationId") REFERENCES "EmiConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
