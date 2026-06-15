-- ── Mejoras en cuentas bancarias ────────────────────────────────────────────
ALTER TABLE cash_accounts
  ADD COLUMN IF NOT EXISTS account_number    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(30) DEFAULT 'cuenta_corriente';

-- ── Chequeras ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkbooks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id)     ON DELETE CASCADE,
  cash_account_id  UUID NOT NULL REFERENCES cash_accounts(id) ON DELETE CASCADE,
  checkbook_type   VARCHAR(20) NOT NULL DEFAULT 'comun',       -- comun | diferido
  number_from      INTEGER NOT NULL,
  number_to        INTEGER NOT NULL,
  current_number   INTEGER NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'activo',      -- activo | agotada
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE checkbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_checkbooks" ON checkbooks
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "owner_checkbooks_insert" ON checkbooks
  FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

CREATE POLICY "owner_checkbooks_update" ON checkbooks
  FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
