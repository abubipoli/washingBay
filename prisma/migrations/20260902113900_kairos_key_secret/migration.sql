/*
  Warnings:

  - You are about to drop the column `kairosApiKey` on the `BusinessSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BusinessSettings" DROP COLUMN "kairosApiKey",
ADD COLUMN     "kairosAccessKey" TEXT,
ADD COLUMN     "kairosAccessSecret" TEXT;
