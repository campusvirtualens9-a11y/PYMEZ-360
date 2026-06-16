'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPurchaseJournalEntry } from '@/lib/accounting/entries'
import { formatCurrency, formatDate } from '@/utils/cn'

export default function PurchaseComprobantePage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const supabase = createClient()

  const [purchase, setPurchase] = useState<any>(null)
  const [hasEntry, setHasEntry] = useState<boolean | null>(null)
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [{ data: purchaseData }, { data: entries }] = await Promise.all([
      supabase
        .from('purchases')
        .select(`
          *,
          supplier:suppliers(name, cuit, email, address),
          company:companies(name, cuit, address),
          items:purchase_items(quantity, unit_price, subtotal, product:products(name, unit))
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('journal_entries')
        .select('id')
        .eq('reference_type', 'purchase')
        .eq('reference_id', id)
        .limit(1),
    ])
    setPurchase(purchaseData)
    setHasEntry((entries?.length ?? 0) > 0)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function registerAccounting() {
    if (!purchase || registering) return
    setRegistering(true)

    await createPurchaseJournalEntry(
      {
        id: purchase.id,
        company_id: purchase.company_id,
        date: purchase.date,
        total: Number(purchase.total),
        transaction_type: purchase.transaction_type,
        iva_rate: Number(purchase.iva_rate ?? 0),
      },
      purchase.transaction_type === 'contado' ? purchase.cash_account_id : null
    )

    setHasEntry(true)
    setRegistered(true)
    setRegistering(false)
  }

  async function cancelPurchase() {
    if (!purchase || cancelling || purchase.status === 'cancelado') return
    setCancelling(true)
    setCancelError(null)

    const { data: payable } = await supabase
      .from('payables').select('id, pending_amount, original_amount, supplier_id, status')
      .eq('purchase_id', purchase.id).maybeSingle()

    if (payable && payable.status !== 'pendiente') {
      setCancelError('No se puede anular: hay pagos registrados sobre esta compra. Anulá los pagos primero.')
      setCancelling(false)
      return
    }

    const { data: items } = await supabase
      .from('purchase_items').select('product_id, quantity, unit_price').eq('purchase_id', purchase.id)

    if (items) {
      for (const item of items) {
        await supabase.from('stock_movements').insert({
          company_id: purchase.company_id, product_id: item.product_id,
          date: new Date().toISOString().split('T')[0], type: 'salida',
          quantity: Number(item.quantity), unit_cost: Number(item.unit_price),
          reason: `Anulación compra${purchase.doc_number ? ' #' + String(purchase.doc_number).padStart(8, '0') : ''}`,
          reference_type: 'purchase_cancellation', reference_id: purchase.id,
        })
        const { data: prod } = await supabase.from('products').select('stock_current').eq('id', item.product_id).single()
        if (prod) {
          await supabase.from('products').update({ stock_current: Math.max(0, Number(prod.stock_current) - Number(item.quantity)) }).eq('id', item.product_id)
        }
      }
    }

    if (purchase.transaction_type === 'contado' && purchase.cash_account_id) {
      const { data: acct } = await supabase.from('cash_accounts').select('balance').eq('id', purchase.cash_account_id).single()
      if (acct) {
        await supabase.from('cash_accounts').update({ balance: Number(acct.balance) + Number(purchase.total) }).eq('id', purchase.cash_account_id)
      }
      await supabase.from('cash_movements').insert({
        company_id: purchase.company_id, cash_account_id: purchase.cash_account_id,
        date: new Date().toISOString().split('T')[0], type: 'ingreso', amount: Number(purchase.total),
        concept: `Anulación compra — ${purchase.supplier?.name ?? 'proveedor'}`,
        reference_type: 'purchase_cancellation', reference_id: purchase.id,
      })
    } else if (purchase.transaction_type === 'cuenta_corriente' && payable) {
      await supabase.from('payables').update({ pending_amount: 0, status: 'pagado' }).eq('id', payable.id)
      const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', payable.supplier_id).single()
      if (sup) {
        await supabase.from('suppliers').update({ balance: Math.max(0, Number(sup.balance) - Number(payable.original_amount)) }).eq('id', payable.supplier_id)
      }
    }

    const { data: entries } = await supabase.from('journal_entries').select('id')
      .eq('reference_type', 'purchase').eq('reference_id', purchase.id).limit(1)
    if (entries && entries.length > 0) {
      const { data: lines } = await supabase.from('journal_entry_lines')
        .select('account_id, debit, credit, description').eq('journal_entry_id', entries[0].id)
      if (lines && lines.length > 0) {
        const { data: rev } = await supabase.from('journal_entries').insert({
          company_id: purchase.company_id, date: new Date().toISOString().split('T')[0],
          description: `Anulación: ${purchase.supplier?.name ?? 'compra'} — Asiento de reversión`,
          entry_type: 'automatico', reference_type: 'purchase_cancellation', reference_id: purchase.id,
        }).select('id').single()
        if (rev) {
          await supabase.from('journal_entry_lines').insert(
            lines.map((l: any) => ({ journal_entry_id: rev.id, account_id: l.account_id, debit: Number(l.credit), credit: Number(l.debit), description: `[Reversión] ${l.description ?? ''}` }))
          )
        }
      }
    }

    const { error: cancelErr } = await supabase.from('purchases').update({ status: 'cancelado' }).eq('id', purchase.id)
    setCancelling(false)
    setCancelConfirm(false)
    if (cancelErr) { setCancelError('Error al anular. Recargá la página.') } else { load() }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando comprobante...</div>
  if (!purchase) return <div className="p-8 text-center text-red-500">Comprobante no encontrado.</div>

  const ivaRate   = Number(purchase.iva_rate ?? 0)
  const ivaAmount = ivaRate > 0 ? Math.round(Number(purchase.total) * ivaRate / (1 + ivaRate) * 100) / 100 : 0
  const netAmount = Number(purchase.total) - ivaAmount
  const nro = purchase.doc_number
    ? `0001-${String(purchase.doc_number).padStart(8, '0')}`
    : `0001-${String(purchase.id).slice(-8).toUpperCase()}`
  const DOC_LABELS: Record<string, { letter: string; label: string }> = {
    factura_a:     { letter: 'A',    label: 'FACTURA A' },
    factura_b:     { letter: 'B',    label: 'FACTURA B' },
    factura_c:     { letter: 'C',    label: 'FACTURA C' },
    nota_debito_a: { letter: 'ND-A', label: 'NOTA DE DÉBITO A' },
    nota_credito_a:{ letter: 'NC-A', label: 'NOTA DE CRÉDITO A' },
  }
  const docInfo = DOC_LABELS[purchase.document_type ?? 'factura_a'] ?? { letter: 'A', label: 'FACTURA A' }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; }
        }
      ` }} />

      {/* Barra de acciones */}
      <div className="no-print flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-sm">
          ← Volver
        </button>

        <div className="ml-auto flex items-center gap-3">
          {hasEntry ? (
            <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-medium">
              ✓ Asiento contable registrado
            </span>
          ) : (
            <button
              onClick={registerAccounting}
              disabled={registering}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-60 transition-colors"
            >
              {registering ? 'Registrando...' : 'Registrar en contabilidad'}
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
          >
            Imprimir comprobante
          </button>

          {purchase.status !== 'cancelado' && !cancelConfirm && (
            <button
              onClick={() => setCancelConfirm(true)}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm rounded-lg hover:bg-red-100 font-medium"
            >
              Anular compra
            </button>
          )}
        </div>
      </div>

      {cancelConfirm && (
        <div className="no-print mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-800 mb-1">¿Confirmar anulación?</p>
          <p className="text-xs text-red-700 mb-3">Esta acción revierte el stock, la tesorería o la deuda con el proveedor, y genera un asiento contable de reversión. No se puede deshacer.</p>
          {cancelError && <p className="text-sm text-red-700 font-medium mb-3">{cancelError}</p>}
          <div className="flex gap-2">
            <button onClick={cancelPurchase} disabled={cancelling}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium disabled:opacity-60">
              {cancelling ? 'Anulando...' : 'Confirmar anulación'}
            </button>
            <button onClick={() => { setCancelConfirm(false); setCancelError(null) }}
              className="px-4 py-2 bg-white text-slate-600 border border-slate-300 text-sm rounded-lg hover:bg-slate-50 font-medium">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {purchase.status === 'cancelado' && (
        <div className="no-print mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-semibold text-center">
          ✕ Esta compra fue anulada — los efectos en stock, tesorería y contabilidad fueron revertidos
        </div>
      )}

      {registered && (
        <div className="no-print mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          ✓ Asiento contable generado. Incluye mercaderías{ivaAmount > 0 ? ` e IVA Crédito Fiscal (${(ivaRate * 100).toFixed(1)}%)` : ''}.
        </div>
      )}

      {/* Comprobante */}
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm print-area">
        {/* Encabezado */}
        <div className="p-6 border-b border-slate-200 grid grid-cols-2 gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{purchase.company?.name ?? 'Empresa'}</h1>
            {purchase.company?.cuit && <p className="text-sm text-slate-500 mt-0.5">CUIT: {purchase.company.cuit}</p>}
            {purchase.company?.address && <p className="text-sm text-slate-500">{purchase.company.address}</p>}
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="w-14 h-14 border-2 border-slate-700 rounded-lg flex items-center justify-center mb-1">
              <span className="text-xl font-bold font-mono text-slate-800">{docInfo.letter}</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{docInfo.label}</p>
            <p className="text-base font-bold text-slate-800">Nro: {nro}</p>
            <p className="text-sm text-slate-500">Fecha: {formatDate(purchase.date)}</p>
            {purchase.supplier_doc && (
              <p className="text-xs text-slate-400">Nro proveedor: {purchase.supplier_doc}</p>
            )}
          </div>
        </div>

        {/* Proveedor */}
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Proveedor</p>
              <p className="font-semibold text-slate-800">{purchase.supplier?.name ?? '—'}</p>
              {purchase.supplier?.cuit && <p className="text-slate-500">CUIT: {purchase.supplier.cuit}</p>}
              {purchase.supplier?.email && <p className="text-slate-500">{purchase.supplier.email}</p>}
              {purchase.supplier?.address && <p className="text-slate-500">{purchase.supplier.address}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Condiciones</p>
              <p className="text-slate-700 font-medium capitalize">{purchase.transaction_type?.replace('_', ' ')}</p>
              {purchase.payment_method && <p className="text-slate-500 capitalize">{purchase.payment_method}</p>}
              <p className={`text-xs mt-1 font-medium ${purchase.status === 'pagado' ? 'text-green-600' : 'text-red-600'}`}>
                Estado: {purchase.status}
              </p>
            </div>
          </div>
        </div>

        {/* Ítems */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Cant.</th>
              <th className="text-left px-3 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Descripción</th>
              <th className="text-right px-3 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">P. Unitario</th>
              <th className="text-right px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(purchase.items ?? []).map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="px-6 py-3 text-slate-700">{item.quantity} {item.product?.unit ?? ''}</td>
                <td className="px-3 py-3 text-slate-800 font-medium">{item.product?.name ?? '—'}</td>
                <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(Number(item.unit_price))}</td>
                <td className="px-6 py-3 text-right font-medium text-slate-800">{formatCurrency(Number(item.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="p-6 border-t border-slate-200">
          <div className="ml-auto max-w-xs space-y-1.5 text-sm">
            {ivaRate > 0 && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal neto:</span><span>{formatCurrency(netAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA {(ivaRate * 100).toFixed(1)}% (crédito fiscal):</span><span>{formatCurrency(ivaAmount)}</span>
                </div>
              </>
            )}
            <div className={`flex justify-between font-bold text-lg text-slate-800 ${ivaRate > 0 ? 'border-t border-slate-200 pt-2 mt-2' : ''}`}>
              <span>TOTAL:</span><span>{formatCurrency(Number(purchase.total))}</span>
            </div>
          </div>
        </div>

        {purchase.notes && (
          <div className="px-6 pb-4 text-sm text-slate-500">
            <span className="font-medium">Observaciones:</span> {purchase.notes}
          </div>
        )}

        <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100 text-xs text-slate-400 text-center">
          Documento no válido como factura legal — EduERP 360 (herramienta educativa)
        </div>
      </div>
    </>
  )
}
