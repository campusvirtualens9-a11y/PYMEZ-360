-- Agrega columna iva_rate a ventas y compras.
-- Default 0 para registros existentes (no se puede determinar retroactivamente).
-- Nuevos registros elegirán 0, 0.105 o 0.21 en el formulario.

ALTER TABLE sales     ADD COLUMN IF NOT EXISTS iva_rate NUMERIC(5,4) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS iva_rate NUMERIC(5,4) DEFAULT 0;
