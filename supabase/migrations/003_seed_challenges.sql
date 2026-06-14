-- ============================================================
-- EduERP 360 — Desafíos iniciales
-- ============================================================
insert into public.challenges (code, title, description, xp_reward, module, required_count)
values
  ('FIRST_CUSTOMER',   'Primer cliente',         'Registrá tu primer cliente.',                        20, 'customers',  1),
  ('THREE_CUSTOMERS',  '3 clientes registrados', 'Registrá al menos 3 clientes.',                      30, 'customers',  3),
  ('FIRST_SUPPLIER',   'Primer proveedor',        'Registrá tu primer proveedor.',                      20, 'suppliers',  1),
  ('TWO_SUPPLIERS',    '2 proveedores',           'Registrá al menos 2 proveedores.',                   25, 'suppliers',  2),
  ('FIRST_PRODUCT',    'Primer producto',         'Cargá tu primer producto al catálogo.',              20, 'products',   1),
  ('TEN_PRODUCTS',     'Catálogo completo',       'Cargá al menos 10 productos.',                       50, 'products',  10),
  ('FIRST_PURCHASE',   'Primera compra',          'Realizá tu primera compra.',                         40, 'purchases',  1),
  ('CASH_PURCHASE',    'Compra de contado',       'Realizá una compra pagando de contado.',             30, 'purchases',  1),
  ('CREDIT_PURCHASE',  'Compra a crédito',        'Realizá una compra a cuenta corriente.',             30, 'purchases',  1),
  ('FIRST_SALE',       'Primera venta',           'Realizá tu primera venta.',                          40, 'sales',      1),
  ('CASH_SALE',        'Venta de contado',        'Realizá una venta cobrando de contado.',             30, 'sales',      1),
  ('CREDIT_SALE',      'Venta a crédito',         'Realizá una venta a cuenta corriente.',              30, 'sales',      1),
  ('FIRST_COLLECTION', 'Primer cobro',            'Cobrá una factura pendiente de un cliente.',         35, 'collections',1),
  ('FIRST_PAYMENT',    'Primer pago',             'Pagá una deuda a un proveedor.',                     35, 'payments',   1),
  ('CHECK_STOCK',      'Control de stock',        'Revisá el inventario de productos.',                 15, 'inventory',  1),
  ('ADJUST_STOCK',     'Ajuste de stock',         'Realizá un ajuste de inventario con justificación.', 25, 'inventory',  1),
  ('VIEW_JOURNAL',     'Libro diario',            'Consultá el libro diario de asientos contables.',    20, 'accounting', 1),
  ('VIEW_BALANCE',     'Balance de saldos',       'Generá el balance de sumas y saldos.',               30, 'accounting', 1),
  ('FULL_CIRCUIT',     'Circuito completo',       'Completá el circuito: compra, venta, cobro y pago.', 100,'general',   1)
on conflict (code) do nothing;
