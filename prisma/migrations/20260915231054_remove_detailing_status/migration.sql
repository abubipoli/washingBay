-- AlterEnum
-- Removes the DETAILING wash status. No rows use it (verified before this
-- migration was written), so the cast below is safe.
BEGIN;
CREATE TYPE "WashStatus_new" AS ENUM ('QUEUED', 'WASHING', 'COMPLETED', 'CANCELLED');
ALTER TABLE "WashRecord" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WashRecord" ALTER COLUMN "status" TYPE "WashStatus_new" USING ("status"::text::"WashStatus_new");
ALTER TYPE "WashStatus" RENAME TO "WashStatus_old";
ALTER TYPE "WashStatus_new" RENAME TO "WashStatus";
DROP TYPE "WashStatus_old";
ALTER TABLE "WashRecord" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
COMMIT;
