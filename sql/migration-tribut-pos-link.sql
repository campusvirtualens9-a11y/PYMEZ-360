-- Migración: vinculación con TRIBUT.AR (Punto de Venta)
-- Ejecutar en Supabase SQL Editor del proyecto PyMEZ 360 (cqloepucatpusvusheel)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tribut_pos_code      TEXT,
  ADD COLUMN IF NOT EXISTS tribut_pos_number    INTEGER,
  ADD COLUMN IF NOT EXISTS tribut_pos_name      TEXT,
  ADD COLUMN IF NOT EXISTS tribut_pos_linked_at TIMESTAMPTZ;
