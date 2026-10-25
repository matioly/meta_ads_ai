ALTER TABLE creative_drafts
 ADD COLUMN IF NOT EXISTS meta_video_id VARCHAR(30),
 ADD COLUMN IF NOT EXISTS meta_creative_id VARCHAR(30),
 ADD COLUMN IF NOT EXISTS meta_ad_id VARCHAR(30),
 ADD COLUMN IF NOT EXISTS meta_publish_state VARCHAR(24) NOT NULL DEFAULT 'draft',
 ADD COLUMN IF NOT EXISTS meta_last_error TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS creative_drafts_meta_ad_unique ON creative_drafts(company_id,meta_ad_id) WHERE meta_ad_id IS NOT NULL;
