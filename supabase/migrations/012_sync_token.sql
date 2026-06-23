-- Agrega codigo de acceso unico por empresa para integracion con TRIBUT.AR
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sync_token TEXT;

UPDATE companies
SET sync_token = upper(substring(md5(id::text || 'tributar2026'), 1, 6))
WHERE sync_token IS NULL;

CREATE OR REPLACE FUNCTION generate_company_sync_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sync_token IS NULL THEN
    NEW.sync_token := upper(substring(md5(gen_random_uuid()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_sync_token ON companies;
CREATE TRIGGER trg_company_sync_token
  BEFORE INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION generate_company_sync_token();

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_sync_token_unique;
ALTER TABLE companies ADD CONSTRAINT companies_sync_token_unique UNIQUE (sync_token);