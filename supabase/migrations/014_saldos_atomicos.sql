-- Migración 014: saldos de clientes y proveedores, atómicos
--
-- La 005 ya había creado `update_cash_balance` justamente para evitar el
-- read-modify-write sobre `cash_accounts.balance`... pero ningún punto del
-- código la llamaba: los 15 lugares seguían calculando el saldo nuevo en el
-- navegador y escribiéndolo entero.
--
-- El problema no es sólo teórico. Las tarjetas de pago de IVA y de sueldos
-- conviven en /accounting y reciben el mismo arreglo de cuentas como prop. Si
-- se pagan las dos sin recargar, la segunda escribe el saldo calculado desde
-- el valor de ANTES del primer pago: el primer egreso desaparece del saldo,
-- aunque su movimiento de caja y su asiento queden registrados. La cuenta deja
-- de coincidir con el mayor, que es lo peor que puede pasar en una app que
-- enseña contabilidad.
--
-- Las cuentas corrientes de clientes y proveedores tienen exactamente el mismo
-- patrón y no tenían función equivalente. Se agregan acá.
--
-- Aplicada en el proyecto de PyMEZ 360 (cqloepucatpusvusheel) el 2026-09-26.

-- Saldo de un cliente. El delta es positivo cuando se le factura a cuenta
-- corriente y negativo cuando cobra. Nunca queda por debajo de cero.
CREATE OR REPLACE FUNCTION update_customer_balance(
  p_customer_id uuid,
  p_delta       numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE customers
  SET    balance = GREATEST(0, COALESCE(balance, 0) + p_delta)
  WHERE  id = p_customer_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer % not found', p_customer_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Saldo de un proveedor. Positivo al comprar a cuenta corriente, negativo al pagar.
CREATE OR REPLACE FUNCTION update_supplier_balance(
  p_supplier_id uuid,
  p_delta       numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE suppliers
  SET    balance = GREATEST(0, COALESCE(balance, 0) + p_delta)
  WHERE  id = p_supplier_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier % not found', p_supplier_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION update_customer_balance(uuid, numeric) FROM public;
REVOKE ALL ON FUNCTION update_supplier_balance(uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION update_customer_balance(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION update_supplier_balance(uuid, numeric) TO authenticated;

-- La 005 no fijaba search_path; se lo agregamos por higiene, ya que es
-- SECURITY DEFINER.
CREATE OR REPLACE FUNCTION update_cash_balance(
  p_account_id uuid,
  p_delta      numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE cash_accounts
  SET    balance = COALESCE(balance, 0) + p_delta
  WHERE  id = p_account_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cash_account % not found', p_account_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION update_cash_balance(uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION update_cash_balance(uuid, numeric) TO authenticated;
