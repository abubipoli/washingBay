-- AlterEnum
ALTER TYPE "VehicleType" ADD VALUE 'BUS';

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "kairosApiKey" TEXT,
ADD COLUMN     "kairosBaseUrl" TEXT,
ADD COLUMN     "kairosSenderId" TEXT,
ADD COLUMN     "smsProvider" TEXT NOT NULL DEFAULT 'console';

-- AlterTable
ALTER TABLE "ServiceType" ALTER COLUMN "defaultBusinessPct" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "defaultStaffPct" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "defaultSoapPct" SET DATA TYPE DOUBLE PRECISION;
