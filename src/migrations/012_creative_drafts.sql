CREATE TABLE creative_drafts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 media_id UUID NOT NULL,
 campaign_meta_id VARCHAR(30) NOT NULL DEFAULT '',
 adset_meta_id VARCHAR(30) NOT NULL DEFAULT '',
 headline VARCHAR(255) NOT NULL CHECK (length(trim(headline)) > 0),
 primary_text VARCHAR(2200) NOT NULL CHECK (length(trim(primary_text)) > 0),
 description VARCHAR(255) NOT NULL DEFAULT '',
 created_by UUID NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY (company_id,media_id) REFERENCES media(company_id,id),
 CHECK (campaign_meta_id = '' OR campaign_meta_id ~ '^[0-9]{1,30}$'),
 CHECK (adset_meta_id = '' OR adset_meta_id ~ '^[0-9]{1,30}$'),
 CHECK (adset_meta_id = '' OR campaign_meta_id <> '')
);
CREATE INDEX creative_drafts_company_idx ON creative_drafts(company_id,updated_at DESC);
