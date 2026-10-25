CREATE TABLE benchmark_ad_cache (
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 competitor_id UUID NOT NULL REFERENCES benchmark_competitors(id) ON DELETE CASCADE,
 ads JSONB NOT NULL DEFAULT '[]'::jsonb,
 found INTEGER NOT NULL DEFAULT 0,
 search_mode VARCHAR(20) NOT NULL DEFAULT 'name',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(company_id,competitor_id)
);