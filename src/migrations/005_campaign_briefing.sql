ALTER TABLE campaigns
ADD COLUMN briefing JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE campaigns
ADD CONSTRAINT campaigns_briefing_object
CHECK (jsonb_typeof(briefing) = 'object');