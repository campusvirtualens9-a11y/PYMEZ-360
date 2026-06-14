-- ============================================================
-- 005 · Función atómica para actualizar saldo de cuentas de caja
-- Evita race conditions en actualizaciones concurrentes de saldo.
-- Aplicar en: Supabase Dashboard → SQL Editor
-- ============================================================

create or replace function update_cash_balance(
  p_account_id uuid,
  p_delta       numeric
) returns numeric
language plpgsql
security definer
as $$
declare
  v_new_balance numeric;
begin
  update cash_accounts
  set balance = balance + p_delta
  where id = p_account_id
  returning balance into v_new_balance;

  if not found then
    raise exception 'cash_account % not found', p_account_id;
  end if;

  return v_new_balance;
end;
$$;

revoke all on function update_cash_balance(uuid, numeric) from public;
grant  execute on function update_cash_balance(uuid, numeric) to authenticated;
