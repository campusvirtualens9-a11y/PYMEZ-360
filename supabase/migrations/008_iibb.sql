-- Agrega alícuota de Ingresos Brutos a la tabla companies.
-- Default 3% (tasa estándar Buenos Aires / CABA para actividad comercial).
-- El usuario puede ajustarla al crear la empresa.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS iibb_rate NUMERIC(4,3) DEFAULT 0.03;
