-- ============================================================
-- EduERP 360 — Migración inicial
-- ============================================================

-- Habilitar extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extiende auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'student' check (role in ('admin','teacher','student','guest')),
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COMPANIES (empresas simuladas)
-- ============================================================
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sector text not null default 'comercial'
    check (sector in ('comercial','construccion','salud','gastronomia','transporte')),
  cuit text not null default '00-00000000-0',
  fiscal_condition text not null default 'Responsable Inscripto',
  address text,
  logo_url text,
  currency text not null default 'ARS',
  sim_start_date date not null default current_date,
  owner_id uuid references public.profiles(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CASH ACCOUNTS (cajas y bancos)
-- ============================================================
create table if not exists public.cash_accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null default 'caja' check (type in ('caja','banco')),
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CUSTOMERS (clientes)
-- ============================================================
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  cuit text,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SUPPLIERS (proveedores)
-- ============================================================
create table if not exists public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  cuit text,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCTS (productos e insumos)
-- ============================================================
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  category text,
  unit text not null default 'unidad',
  cost_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  stock_current numeric(14,3) not null default 0,
  stock_min numeric(14,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
create table if not exists public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  date date not null default current_date,
  type text not null check (type in ('entrada','salida','ajuste')),
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2),
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- PURCHASES (compras)
-- ============================================================
create table if not exists public.purchases (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  date date not null default current_date,
  total numeric(14,2) not null default 0,
  transaction_type text not null default 'contado'
    check (transaction_type in ('contado','cuenta_corriente')),
  payment_method text check (payment_method in ('efectivo','transferencia','tarjeta','cheque')),
  cash_account_id uuid references public.cash_accounts(id),
  status text not null default 'pendiente'
    check (status in ('pendiente','pagado','cancelado')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default uuid_generate_v4(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  subtotal numeric(14,2) not null
);

-- ============================================================
-- SALES (ventas)
-- ============================================================
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  date date not null default current_date,
  total numeric(14,2) not null default 0,
  transaction_type text not null default 'contado'
    check (transaction_type in ('contado','cuenta_corriente')),
  payment_method text check (payment_method in ('efectivo','transferencia','tarjeta','cheque')),
  cash_account_id uuid references public.cash_accounts(id),
  status text not null default 'pendiente'
    check (status in ('pendiente','cobrado','cancelado')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  cost_price numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null
);

-- ============================================================
-- RECEIVABLES (cuentas a cobrar)
-- ============================================================
create table if not exists public.receivables (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sale_id uuid not null references public.sales(id),
  customer_id uuid not null references public.customers(id),
  original_amount numeric(14,2) not null,
  pending_amount numeric(14,2) not null,
  due_date date,
  status text not null default 'pendiente'
    check (status in ('pendiente','cobrado_parcial','cobrado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PAYABLES (cuentas a pagar)
-- ============================================================
create table if not exists public.payables (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id),
  supplier_id uuid not null references public.suppliers(id),
  original_amount numeric(14,2) not null,
  pending_amount numeric(14,2) not null,
  due_date date,
  status text not null default 'pendiente'
    check (status in ('pendiente','pagado_parcial','pagado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COLLECTIONS (cobros)
-- ============================================================
create table if not exists public.collections (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  receivable_id uuid references public.receivables(id),
  customer_id uuid not null references public.customers(id),
  cash_account_id uuid not null references public.cash_accounts(id),
  date date not null default current_date,
  amount numeric(14,2) not null,
  payment_method text not null default 'efectivo'
    check (payment_method in ('efectivo','transferencia','tarjeta','cheque')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- PAYMENTS (pagos a proveedores)
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payable_id uuid references public.payables(id),
  supplier_id uuid not null references public.suppliers(id),
  cash_account_id uuid not null references public.cash_accounts(id),
  date date not null default current_date,
  amount numeric(14,2) not null,
  payment_method text not null default 'efectivo'
    check (payment_method in ('efectivo','transferencia','tarjeta','cheque')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CASH MOVEMENTS (movimientos de caja/banco)
-- ============================================================
create table if not exists public.cash_movements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cash_account_id uuid not null references public.cash_accounts(id),
  date date not null default current_date,
  type text not null check (type in ('ingreso','egreso')),
  amount numeric(14,2) not null,
  concept text not null,
  reference_type text,
  reference_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CHART OF ACCOUNTS (plan de cuentas)
-- ============================================================
create table if not exists public.chart_of_accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null check (type in ('activo','pasivo','patrimonio','ingreso','egreso')),
  parent_id uuid references public.chart_of_accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

-- ============================================================
-- JOURNAL ENTRIES (asientos contables)
-- ============================================================
create table if not exists public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  date date not null default current_date,
  description text not null,
  entry_type text not null default 'automatico'
    check (entry_type in ('automatico','manual')),
  reference_type text,
  reference_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entry_lines (
  id uuid primary key default uuid_generate_v4(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id),
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  description text
);

-- ============================================================
-- CHALLENGES (desafíos gamificados)
-- ============================================================
create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  title text not null,
  description text not null,
  xp_reward integer not null default 10,
  sector text,
  module text not null,
  required_count integer not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USER CHALLENGES (progreso de desafíos por estudiante)
-- ============================================================
create table if not exists public.user_challenges (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id),
  progress integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (profile_id, company_id, challenge_id)
);

-- ============================================================
-- XP EVENTS (historial de XP)
-- ============================================================
create table if not exists public.xp_events (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id),
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id),
  profile_id uuid references public.profiles(id),
  action text not null,
  table_name text,
  record_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_companies_owner on public.companies(owner_id);
create index if not exists idx_customers_company on public.customers(company_id);
create index if not exists idx_suppliers_company on public.suppliers(company_id);
create index if not exists idx_products_company on public.products(company_id);
create index if not exists idx_purchases_company on public.purchases(company_id);
create index if not exists idx_sales_company on public.sales(company_id);
create index if not exists idx_receivables_company on public.receivables(company_id);
create index if not exists idx_payables_company on public.payables(company_id);
create index if not exists idx_journal_entries_company on public.journal_entries(company_id);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
create index if not exists idx_user_challenges_profile on public.user_challenges(profile_id);
create index if not exists idx_xp_events_profile on public.xp_events(profile_id);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare
  t text;
begin
  foreach t in array array[
    'profiles','companies','cash_accounts','customers','suppliers',
    'products','purchases','sales','receivables','payables'
  ] loop
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s
       for each row execute function public.handle_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ============================================================
-- TRIGGER: crear profile al registrar usuario
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
