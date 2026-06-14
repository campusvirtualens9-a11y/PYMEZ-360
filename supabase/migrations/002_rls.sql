-- ============================================================
-- EduERP 360 — Row Level Security
-- ============================================================

-- Habilitar RLS en todas las tablas públicas
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.cash_accounts enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.receivables enable row level security;
alter table public.payables enable row level security;
alter table public.collections enable row level security;
alter table public.payments enable row level security;
alter table public.cash_movements enable row level security;
alter table public.chart_of_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenges enable row level security;
alter table public.xp_events enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- Helper: obtener rol del usuario actual
-- ============================================================
create or replace function public.get_my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ============================================================
-- PROFILES
-- ============================================================
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- COMPANIES
-- El dueño ve su empresa; admin ve todas; invitado solo demos
-- ============================================================
create policy "companies_owner_or_admin" on public.companies
  for select using (
    owner_id = auth.uid()
    or public.get_my_role() = 'admin'
    or (is_demo = true and public.get_my_role() = 'guest')
  );

create policy "companies_insert_authenticated" on public.companies
  for insert with check (auth.uid() is not null);

create policy "companies_update_owner_or_admin" on public.companies
  for update using (
    owner_id = auth.uid() or public.get_my_role() = 'admin'
  );

create policy "companies_delete_owner_or_admin" on public.companies
  for delete using (
    owner_id = auth.uid() or public.get_my_role() = 'admin'
  );

-- ============================================================
-- Helper: verificar que el company_id pertenece al usuario
-- ============================================================
create or replace function public.owns_company(cid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.companies
    where id = cid
    and (owner_id = auth.uid() or (is_demo = true))
  )
$$;

-- ============================================================
-- Política reutilizable para tablas hijas de companies
-- ============================================================
-- CASH ACCOUNTS
create policy "cash_accounts_company_owner" on public.cash_accounts
  for all using (public.owns_company(company_id));

-- CUSTOMERS
create policy "customers_company_owner" on public.customers
  for all using (public.owns_company(company_id));

-- SUPPLIERS
create policy "suppliers_company_owner" on public.suppliers
  for all using (public.owns_company(company_id));

-- PRODUCTS
create policy "products_company_owner" on public.products
  for all using (public.owns_company(company_id));

-- STOCK MOVEMENTS
create policy "stock_movements_company_owner" on public.stock_movements
  for all using (public.owns_company(company_id));

-- PURCHASES
create policy "purchases_company_owner" on public.purchases
  for all using (public.owns_company(company_id));

-- PURCHASE ITEMS
create policy "purchase_items_via_purchase" on public.purchase_items
  for all using (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_id and public.owns_company(p.company_id)
    )
  );

-- SALES
create policy "sales_company_owner" on public.sales
  for all using (public.owns_company(company_id));

-- SALE ITEMS
create policy "sale_items_via_sale" on public.sale_items
  for all using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and public.owns_company(s.company_id)
    )
  );

-- RECEIVABLES
create policy "receivables_company_owner" on public.receivables
  for all using (public.owns_company(company_id));

-- PAYABLES
create policy "payables_company_owner" on public.payables
  for all using (public.owns_company(company_id));

-- COLLECTIONS
create policy "collections_company_owner" on public.collections
  for all using (public.owns_company(company_id));

-- PAYMENTS
create policy "payments_company_owner" on public.payments
  for all using (public.owns_company(company_id));

-- CASH MOVEMENTS
create policy "cash_movements_company_owner" on public.cash_movements
  for all using (public.owns_company(company_id));

-- CHART OF ACCOUNTS
create policy "coa_company_owner" on public.chart_of_accounts
  for all using (public.owns_company(company_id));

-- JOURNAL ENTRIES
create policy "journal_entries_company_owner" on public.journal_entries
  for all using (public.owns_company(company_id));

-- JOURNAL ENTRY LINES
create policy "journal_entry_lines_via_entry" on public.journal_entry_lines
  for all using (
    exists (
      select 1 from public.journal_entries je
      where je.id = journal_entry_id and public.owns_company(je.company_id)
    )
  );

-- CHALLENGES (todos pueden leer)
create policy "challenges_read_all" on public.challenges
  for select using (true);

-- USER CHALLENGES
create policy "user_challenges_own" on public.user_challenges
  for all using (profile_id = auth.uid() or public.get_my_role() = 'admin');

-- XP EVENTS
create policy "xp_events_own" on public.xp_events
  for all using (profile_id = auth.uid() or public.get_my_role() = 'admin');

-- AUDIT LOGS (solo admin y propietario)
create policy "audit_logs_owner_or_admin" on public.audit_logs
  for select using (
    profile_id = auth.uid() or public.get_my_role() = 'admin'
  );
