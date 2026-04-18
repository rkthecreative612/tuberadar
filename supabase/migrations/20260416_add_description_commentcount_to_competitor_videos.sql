ALTER TABLE competitor_videos
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE competitor_videos
-- Use quoted identifier so Postgres preserves camelCase, matching the app code.
ADD COLUMN IF NOT EXISTS "commentCount" INT DEFAULT 0;
