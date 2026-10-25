CREATE TABLE benchmark_ads (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 competitor_id UUID NOT NULL REFERENCES benchmark_competitors(id) ON DELETE CASCADE,
 title VARCHAR(160) NOT NULL,
 ad_url TEXT NOT NULL,
 format VARCHAR(30) NOT NULL DEFAULT 'unknown' CHECK (format IN ('video','image','carousel','unknown')),
 message TEXT NOT NULL DEFAULT '',
 hook VARCHAR(300) NOT NULL DEFAULT '',
 call_to_action VARCHAR(160) NOT NULL DEFAULT '',
 observed_at DATE NOT NULL DEFAULT CURRENT_DATE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (company_id, competitor_id, ad_url),
 FOREIGN KEY (competitor_id) REFERENCES benchmark_competitors(id) ON DELETE CASCADE
);
CREATE INDEX benchmark_ads_competitor_idx ON benchmark_ads(company_id, competitor_id, created_at DESC);
