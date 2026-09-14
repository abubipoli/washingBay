-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "customerSmsTemplate" TEXT;

-- AlterTable
ALTER TABLE "WashRecord" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE INDEX "WashRecord_customerId_idx" ON "WashRecord"("customerId");

-- AddForeignKey
ALTER TABLE "WashRecord" ADD CONSTRAINT "WashRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
