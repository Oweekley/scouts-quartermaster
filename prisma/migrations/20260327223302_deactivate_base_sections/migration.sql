-- Hide the old "base" sections (no meeting day) that were created only to
-- migrate legacy enum data. They should not appear in section pickers.
UPDATE "Section"
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "meetingDay" IS NULL
  AND "name" IN ('Beavers', 'Cubs', 'Scouts');
