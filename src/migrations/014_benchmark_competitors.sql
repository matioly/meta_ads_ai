CREATE TABLE benchmark_competitors (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 name VARCHAR(160) NOT NULL,
 city VARCHAR(120) NOT NULL DEFAULT '',
 state VARCHAR(2) NOT NULL DEFAULT '',
 instagram_url TEXT NOT NULL DEFAULT '',
 facebook_url TEXT NOT NULL DEFAULT '',
 specialty VARCHAR(120) NOT NULL DEFAULT '',
 notes VARCHAR(500) NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX benchmark_competitors_company_idx ON benchmark_competitors(company_id, created_at);
