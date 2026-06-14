-- ============================================================
-- 006 · Plan de cuentas completo (125 cuentas) + Asiento de constitución
-- Aplicar en: Supabase Dashboard → SQL Editor
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin duplicar datos.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FUNCIÓN 1: Insertar plan de cuentas para una empresa
-- No inserta cuentas que ya existan (ON CONFLICT DO NOTHING
-- requiere unique constraint; usamos NOT EXISTS para seguridad).
-- ────────────────────────────────────────────────────────────
create or replace function setup_plan_cuentas(p_company_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_inserted integer := 0;
begin
  insert into chart_of_accounts (company_id, code, name, type, is_active)
  select p_company_id, v.code, v.name, v.type, true
  from (values
    -- ── ACTIVO CORRIENTE · Disponibilidades ──────────────────
    ('1.1.1',  'Caja',                                     'activo'),
    ('1.1.2',  'Banco Cuenta Corriente',                   'activo'),
    ('1.1.3',  'Clientes / Deudores por Ventas',           'activo'),
    ('1.1.4',  'Documentos a Cobrar',                      'activo'),
    ('1.1.5',  'Deudores Morosos',                         'activo'),
    ('1.1.6',  'Banco Cuenta Ahorro',                      'activo'),
    ('1.1.7',  'Caja Chica / Fondo Fijo',                  'activo'),
    ('1.1.8',  'Valores a Depositar',                      'activo'),
    ('1.1.9',  'Cheques Diferidos a Cobrar',               'activo'),
    ('1.1.10', 'Inversiones Temporarias (Plazo Fijo)',      'activo'),
    ('1.1.11', 'IVA Crédito Fiscal',                       'activo'),
    ('1.1.12', 'Anticipos a Proveedores',                  'activo'),
    ('1.1.13', 'Otros Créditos Corrientes',                'activo'),
    -- ── ACTIVO CORRIENTE · Bienes de Cambio ──────────────────
    ('1.2.1',  'Mercaderías / Inventario',                 'activo'),
    ('1.2.2',  'Materias Primas',                          'activo'),
    ('1.2.3',  'Productos en Proceso',                     'activo'),
    ('1.2.4',  'Productos Terminados',                     'activo'),
    ('1.2.5',  'Mercadería en Tránsito',                   'activo'),
    ('1.2.6',  'Envases y Embalajes',                      'activo'),
    -- ── ACTIVO NO CORRIENTE · Inversiones ────────────────────
    ('1.3.1',  'Participaciones en Sociedades',            'activo'),
    ('1.3.2',  'Plazo Fijo a Largo Plazo',                 'activo'),
    ('1.3.3',  'Deudores a Largo Plazo',                   'activo'),
    -- ── ACTIVO NO CORRIENTE · Bienes de Uso ──────────────────
    ('1.4.1',  'Terrenos',                                 'activo'),
    ('1.4.2',  'Edificios y Construcciones',               'activo'),
    ('1.4.3',  'Maquinaria y Equipos',                     'activo'),
    ('1.4.4',  'Muebles y Útiles',                         'activo'),
    ('1.4.5',  'Rodados',                                  'activo'),
    ('1.4.6',  'Equipos de Computación',                   'activo'),
    ('1.4.7',  'Herramientas',                             'activo'),
    ('1.4.8',  'Instalaciones',                            'activo'),
    ('1.4.9',  'Amortización Acum. Edificios',             'activo'),
    ('1.4.10', 'Amortización Acum. Maquinaria',            'activo'),
    ('1.4.11', 'Amortización Acum. Muebles y Útiles',      'activo'),
    ('1.4.12', 'Amortización Acum. Rodados',               'activo'),
    ('1.4.13', 'Amortización Acum. Equipos Comp.',         'activo'),
    -- ── ACTIVO NO CORRIENTE · Intangibles ────────────────────
    ('1.5.1',  'Marcas y Patentes',                        'activo'),
    ('1.5.2',  'Llave de Negocio / Fondo de Comercio',     'activo'),
    ('1.5.3',  'Gastos de Organización y Constitución',    'activo'),
    ('1.5.4',  'Software y Licencias',                     'activo'),
    ('1.5.5',  'Amortización Acum. Intangibles',           'activo'),

    -- ── PASIVO CORRIENTE ─────────────────────────────────────
    ('2.1.1',  'Proveedores',                              'pasivo'),
    ('2.1.2',  'Documentos a Pagar',                       'pasivo'),
    ('2.1.3',  'Préstamos Bancarios Corrientes',           'pasivo'),
    ('2.1.4',  'Anticipos de Clientes',                    'pasivo'),
    ('2.1.5',  'IVA Débito Fiscal',                        'pasivo'),
    ('2.1.6',  'Sueldos y Jornales a Pagar',               'pasivo'),
    ('2.1.7',  'Cargas Sociales a Pagar',                  'pasivo'),
    ('2.1.8',  'Ingresos Brutos a Pagar',                  'pasivo'),
    ('2.1.9',  'Impuesto a las Ganancias a Pagar',         'pasivo'),
    ('2.1.10', 'Otras Deudas Fiscales',                    'pasivo'),
    ('2.1.11', 'Alquileres a Pagar',                       'pasivo'),
    ('2.1.12', 'Honorarios a Pagar',                       'pasivo'),
    ('2.1.13', 'Acreedores Varios',                        'pasivo'),
    ('2.1.14', 'Deudas Financieras a Corto Plazo',         'pasivo'),
    ('2.1.15', 'Cheques Diferidos a Pagar',                'pasivo'),
    ('2.1.16', 'Socios / Accionistas Ctas. Corrientes',    'pasivo'),
    -- ── PASIVO NO CORRIENTE ───────────────────────────────────
    ('2.2.1',  'Préstamos Bancarios No Corrientes',        'pasivo'),
    ('2.2.2',  'Hipotecas a Pagar',                        'pasivo'),
    ('2.2.3',  'Deudas Financieras a Largo Plazo',         'pasivo'),
    ('2.2.4',  'Previsión para Despidos',                  'pasivo'),
    ('2.2.5',  'Otras Previsiones',                        'pasivo'),
    ('2.2.6',  'Ingresos Diferidos',                       'pasivo'),
    ('2.2.7',  'Garantías Recibidas',                      'pasivo'),

    -- ── PATRIMONIO NETO ───────────────────────────────────────
    ('3.1.1',  'Capital Social',                           'patrimonio'),
    ('3.1.2',  'Aportes Irrevocables (Futuros Aumentos)',  'patrimonio'),
    ('3.2.1',  'Reserva Legal',                            'patrimonio'),
    ('3.2.2',  'Reserva Estatutaria',                      'patrimonio'),
    ('3.2.3',  'Reserva Facultativa',                      'patrimonio'),
    ('3.3.1',  'Resultados No Asignados (Ejercicios Ant.)','patrimonio'),
    ('3.3.2',  'Resultado del Ejercicio',                  'patrimonio'),
    ('3.3.3',  'Dividendos en Efectivo',                   'patrimonio'),

    -- ── INGRESOS · Ventas ─────────────────────────────────────
    ('4.1.1',  'Ventas',                                   'ingreso'),
    ('4.1.2',  'Devoluciones sobre Ventas',                'ingreso'),
    ('4.1.3',  'Descuentos sobre Ventas',                  'ingreso'),
    ('4.1.4',  'Ventas de Servicios',                      'ingreso'),
    ('4.1.5',  'Intereses por Financiación de Ventas',     'ingreso'),
    -- ── INGRESOS · Otros Ingresos ─────────────────────────────
    ('4.2.1',  'Alquileres Ganados',                       'ingreso'),
    ('4.2.2',  'Intereses Ganados',                        'ingreso'),
    ('4.2.3',  'Diferencia de Cambio Positiva',            'ingreso'),
    ('4.2.4',  'Utilidad en Venta de Bienes de Uso',       'ingreso'),
    ('4.2.5',  'Descuentos Obtenidos de Proveedores',      'ingreso'),
    ('4.2.6',  'Comisiones Ganadas',                       'ingreso'),
    ('4.2.7',  'Recupero de Deudas Incobrables',           'ingreso'),
    ('4.2.8',  'Ingresos por Subsidios y Ayudas',          'ingreso'),
    ('4.2.9',  'Otros Ingresos Varios',                    'ingreso'),

    -- ── EGRESOS · Costo de Ventas ─────────────────────────────
    ('5.1.1',  'Costo de Mercadería Vendida',              'egreso'),
    ('5.1.2',  'Costo de Servicios Prestados',             'egreso'),
    ('5.1.3',  'Devoluciones sobre Compras',               'egreso'),
    ('5.1.4',  'Descuentos sobre Compras',                 'egreso'),
    -- ── EGRESOS · Gastos de Comercialización ─────────────────
    ('5.2.1',  'Sueldos y Jornales (Comercialización)',    'egreso'),
    ('5.2.2',  'Cargas Sociales (Comercialización)',       'egreso'),
    ('5.2.3',  'Publicidad y Propaganda',                  'egreso'),
    ('5.2.4',  'Fletes y Acarreos sobre Ventas',           'egreso'),
    ('5.2.5',  'Comisiones sobre Ventas',                  'egreso'),
    ('5.2.6',  'Embalajes y Packaging',                    'egreso'),
    ('5.2.7',  'Viáticos y Movilidad (Comercial)',         'egreso'),
    ('5.2.8',  'Muestras y Obsequios a Clientes',          'egreso'),
    ('5.2.9',  'Ferias y Exposiciones',                    'egreso'),
    -- ── EGRESOS · Gastos de Administración ───────────────────
    ('5.3.1',  'Sueldos y Jornales (Administración)',      'egreso'),
    ('5.3.2',  'Cargas Sociales (Administración)',         'egreso'),
    ('5.3.3',  'Alquileres y Arrendamientos',              'egreso'),
    ('5.3.4',  'Servicios Públicos (Luz, Gas, Agua)',      'egreso'),
    ('5.3.5',  'Telecomunicaciones e Internet',            'egreso'),
    ('5.3.6',  'Honorarios Contables y Legales',           'egreso'),
    ('5.3.7',  'Papelería y Útiles de Oficina',            'egreso'),
    ('5.3.8',  'Mantenimiento y Reparaciones',             'egreso'),
    ('5.3.9',  'Seguros',                                  'egreso'),
    ('5.3.10', 'Amortizaciones y Depreciaciones',          'egreso'),
    ('5.3.11', 'Limpieza e Higiene',                       'egreso'),
    ('5.3.12', 'Viáticos y Movilidad (Administración)',    'egreso'),
    ('5.3.13', 'Combustibles y Lubricantes',               'egreso'),
    ('5.3.14', 'Impuesto a los Ingresos Brutos',           'egreso'),
    ('5.3.15', 'Sellos e Impuestos Menores',               'egreso'),
    ('5.3.16', 'Gastos Varios de Administración',          'egreso'),
    ('5.3.17', 'Indemnizaciones y Liquidaciones',          'egreso'),
    ('5.3.18', 'Capacitación y Formación del Personal',    'egreso'),
    ('5.3.19', 'Insumos Informáticos',                     'egreso'),
    ('5.3.20', 'Gastos de Seguridad',                      'egreso'),
    -- ── EGRESOS · Gastos Financieros ─────────────────────────
    ('5.4.1',  'Intereses Pagados',                        'egreso'),
    ('5.4.2',  'Descuentos Concedidos a Clientes',         'egreso'),
    ('5.4.3',  'Diferencia de Cambio Negativa',            'egreso'),
    ('5.4.4',  'Gastos Bancarios',                         'egreso'),
    ('5.4.5',  'Comisiones y Gastos de Tarjetas',          'egreso'),
    ('5.4.6',  'Pérdida en Venta de Inversiones',          'egreso'),
    ('5.4.7',  'Multas e Intereses por Mora',              'egreso')
  ) as v(code, name, type)
  where not exists (
    select 1
    from chart_of_accounts x
    where x.company_id = p_company_id
      and x.code       = v.code
  );

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCIÓN 2: Crear asiento de constitución (idempotente)
-- Lee los saldos actuales de caja/banco de la empresa.
-- No crea el asiento si ya existe uno de constitución.
-- ────────────────────────────────────────────────────────────
create or replace function setup_asiento_constitucion(p_company_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_entry_id   uuid;
  v_caja_id    uuid;
  v_banco_id   uuid;
  v_capital_id uuid;
  v_cash       numeric := 0;
  v_bank       numeric := 0;
  v_total      numeric;
  v_date       date    := current_date;
begin
  -- No duplicar si ya existe el asiento de constitución
  if exists (
    select 1 from journal_entries
    where company_id = p_company_id
      and description = 'Asiento de constitución — Aporte inicial de capital'
  ) then
    return 'YA_EXISTE';
  end if;

  -- IDs de las cuentas contables requeridas
  select id into v_caja_id
  from chart_of_accounts
  where company_id = p_company_id and code = '1.1.1' limit 1;

  select id into v_banco_id
  from chart_of_accounts
  where company_id = p_company_id and code = '1.1.2' limit 1;

  select id into v_capital_id
  from chart_of_accounts
  where company_id = p_company_id and code = '3.1.1' limit 1;

  if v_caja_id is null or v_banco_id is null or v_capital_id is null then
    return 'ERROR: cuentas 1.1.1, 1.1.2 o 3.1.1 no encontradas. Ejecutar setup_plan_cuentas primero.';
  end if;

  -- Leer saldos actuales de caja y banco
  select
    coalesce(sum(case when type = 'caja'  then balance else 0 end), 0),
    coalesce(sum(case when type = 'banco' then balance else 0 end), 0)
  into v_cash, v_bank
  from cash_accounts
  where company_id = p_company_id;

  -- Si no hay cuentas de caja/banco, usar valores por defecto del setup
  if v_cash = 0 and v_bank = 0 then
    v_cash := 50000;
    v_bank := 100000;
  end if;

  v_total := v_cash + v_bank;

  -- Tomar la fecha de creación de la empresa si está disponible
  select coalesce(sim_start_date::date, created_at::date, current_date)
  into v_date
  from companies
  where id = p_company_id;

  -- Crear el asiento
  insert into journal_entries (company_id, date, description, entry_type)
  values (p_company_id, v_date, 'Asiento de constitución — Aporte inicial de capital', 'automatico')
  returning id into v_entry_id;

  -- Líneas del asiento
  if v_cash > 0 then
    insert into journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
    values (v_entry_id, v_caja_id, v_cash, 0, 'Efectivo aportado por los socios');
  end if;

  if v_bank > 0 then
    insert into journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
    values (v_entry_id, v_banco_id, v_bank, 0, 'Depósito bancario inicial');
  end if;

  insert into journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
  values (v_entry_id, v_capital_id, 0, v_total, 'Capital social aportado');

  return 'OK: asiento creado · Debe=' || v_total || ' · Haber=' || v_total;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- APLICAR A TODAS LAS EMPRESAS EXISTENTES
-- Ejecuta ambas funciones para cada empresa en la base de datos.
-- ────────────────────────────────────────────────────────────
do $$
declare
  r              record;
  v_accounts_ins integer;
  v_entry_result text;
begin
  for r in select id, name from companies order by created_at loop
    -- 1. Plan de cuentas
    v_accounts_ins := setup_plan_cuentas(r.id);
    raise notice 'Empresa "%": % cuentas insertadas', r.name, v_accounts_ins;

    -- 2. Asiento de constitución
    v_entry_result := setup_asiento_constitucion(r.id);
    raise notice 'Empresa "%": asiento constitución → %', r.name, v_entry_result;
  end loop;

  raise notice '=== Setup completo para todas las empresas ===';
end;
$$;

-- ────────────────────────────────────────────────────────────
-- PERMISOS (las funciones se llaman desde el servidor)
-- ────────────────────────────────────────────────────────────
revoke all on function setup_plan_cuentas(uuid)           from public;
revoke all on function setup_asiento_constitucion(uuid)   from public;
grant execute on function setup_plan_cuentas(uuid)         to authenticated;
grant execute on function setup_asiento_constitucion(uuid) to authenticated;
