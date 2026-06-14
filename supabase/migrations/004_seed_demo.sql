-- ============================================================
-- EduERP 360 — Empresa demo + datos iniciales
-- NOTA: esta migración crea datos de referencia sin usuario real.
--       Los seeds de empresa específica se crean desde la app.
-- ============================================================

-- Plan de cuentas básico para PyME comercial (se usará como plantilla)
-- Se insertará por función server-side cuando el usuario crea su empresa.
-- Este archivo queda como referencia del esquema contable base.

/*
  CÓDIGO  | NOMBRE                        | TIPO
  --------+-------------------------------+-----------
  1.1.1   | Caja                          | activo
  1.1.2   | Banco                         | activo
  1.1.3   | Clientes                      | activo
  1.2.1   | Mercaderías                   | activo
  2.1.1   | Proveedores                   | pasivo
  3.1.1   | Capital                       | patrimonio
  4.1.1   | Ventas                        | ingreso
  5.1.1   | Costo de Mercadería Vendida   | egreso
  5.1.2   | Gastos Generales              | egreso
*/

select 'Plan de cuentas definido en migrations. Seed real se ejecuta desde la app.' as info;
