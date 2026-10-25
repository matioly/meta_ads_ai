CREATE TABLE drive_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL CHECK (length(trim(label)) > 0),
  email VARCHAR(254) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, label)
);

CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL CHECK (length(trim(name)) > 0),
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('video', 'image')),
  drive_file_id VARCHAR(200) NOT NULL,
  drive_url TEXT NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, drive_file_id),
  FOREIGN KEY (company_id, account_id)
    REFERENCES drive_accounts(company_id, id)
);
CREATE INDEX media_company_created_idx ON media(company_id, created_at DESC);
CREATE INDEX media_account_idx ON media(company_id, account_id);

ALTER TABLE campaigns ADD COLUMN media_id UUID;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_media_company_fk
  FOREIGN KEY (company_id, media_id) REFERENCES media(company_id, id);
CREATE INDEX campaigns_media_idx ON campaigns(company_id, media_id);

