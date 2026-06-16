-- ============================================================
-- Fix: sincronizar purchases.status y sales.status con el
-- estado real de sus payables/receivables
-- ============================================================

-- Marcar como 'pagado' las compras cuyo payable está completamente pagado
UPDATE public.purchases
SET status = 'pagado'
WHERE id IN (
  SELECT DISTINCT purchase_id
  FROM public.payables
  WHERE status = 'pagado'
    AND purchase_id IS NOT NULL
)
AND status = 'pendiente';

-- Marcar como 'cobrado' las ventas cuyo receivable está completamente cobrado
UPDATE public.sales
SET status = 'cobrado'
WHERE id IN (
  SELECT DISTINCT sale_id
  FROM public.receivables
  WHERE status = 'cobrado'
    AND sale_id IS NOT NULL
)
AND status = 'pendiente';
