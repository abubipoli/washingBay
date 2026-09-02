-- Kairos Africa's API host is fixed (https://api.kairosafrika.com/v1), so
-- there's no per-business base URL to configure. The stored value was also
-- wrong in practice (owners entered the marketing site, not the API host).
ALTER TABLE "BusinessSettings" DROP COLUMN "kairosBaseUrl";
