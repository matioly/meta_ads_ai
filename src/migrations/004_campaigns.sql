CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL
    REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID
    REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL
    CHECK (length(trim(name)) > 0),
  objective TEXT NOT NULL
    CHECK (objective IN (
      'Conversas no WhatsApp',
      'Geração de leads',
      'Reconhecimento'
    )),
  budget_cents INTEGER NOT NULL
    CHECK (budget_cents BETWEEN 100 AND 10000000),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status = 'draft'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_company_created_idx
  ON campaigns (company_id, created_at DESC);