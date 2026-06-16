'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createSaleJournalEntry } from '@/lib/accounting/entries'
import { formatCurrency, formatDate } from '@/utils/cn'

export default function SaleComprobantePage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const supabase = createClient()

  const [sale, setSale] = useState<any>(null)
  const [hasEntry, setHasEntry] = useState<boolean | null>(null)
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [{ data: saleData }, { data: entries }] = await Promise.all([
      supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name, cuit, email, address),
          company:companies(name, cuit, address, iibb_rate),
          items:sale_items(quantity, unit_price, cost_price, subtotal, product:products(name, unit))
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('journal_entries')
        .select('id')
        .eq('reference_type', 'sale')
        .eq('reference_id', id)
        .limit(1),
    ])
    setSale(saleData)
    setHasEntry((entries?.length ?? 0) > 0)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function registerAccounting() {
    if (!sale || registering) return
    setRegistering(true)

    const totalCost = (sale.items ?? []).reduce(
      (s: number, item: any) => s + Number(item.quantity) * Number(item.cost_price ?? 0),
      0
    )

    await createSaleJournalEntry(
      {
        id: sale.id,
        company_id: sale.company_id,
        date: sale.date,
        total: Number(sale.total),
        transaction_type: sale.transaction_type,
        iva_rate: Number(sale.iva_rate ?? 0),
        iibb_rate: Number(sale.company?.iibb_rate ?? 0),
      },
      totalCost
    )

    setHasEntry(true)
    setRegistered(true)
    setRegistering(false)
  }

  async function cancelSale() {
    if (!sale || cancelling || sale.status === 'cancelado') return
    setCancelling(true)
    setCancelError(null)

    const { data: receivable } = await supabase
      .from('receivables').select('id, pending_amount, original_amount, customer_id, status')
      .eq('sale_id', sale.id).maybeSingle()

    if (receivable && receivable.status !== 'pendiente') {
      setCancelError('No se puede anular: hay cobros registrados sobre esta venta. Anulá los cobros primero.')
      setCancelling(false)
      return
    }

    const { data: items } = await supabase
      .from('sale_items').select('product_id, quantity, cost_price').eq('sale_id', sale.id)

    if (items) {
      for (const item of items) {
        await supabase.from('stock_movements').insert({
          company_id: sale.company_id, product_id: item.product_id,
          date: new Date().toISOString().split('T')[0], type: 'entrada',
          quantity: Number(item.quantity), unit_cost: Number(item.cost_price ?? 0),
          reason: `Anulación venta${sale.doc_number ? ' #' + String(sale.doc_number).padStart(8, '0') : ''}`,
          reference_type: 'sale_cancellation', reference_id: sale.id,
        })
        const { data: prod } = await supabase.from('products').select('stock_current').eq('id', item.product_id).single()
        if (prod) {
          await supabase.from('products').update({ stock_current: Number(prod.stock_current) + Number(item.quantity) }).eq('id', item.product_id)
        }
      }
    }

    if (sale.transaction_type === 'contado' && sale.cash_account_id) {
      const { data: acct } = await supabase.from('cash_accounts').select('balance').eq('id', sale.cash_account_id).single()
      if (acct) {
        await supabase.from('cash_accounts').update({ balance: Number(acct.balance) - Number(sale.total) }).eq('id', sale.cash_account_id)
      }
      await supabase.from('cash_movements').insert({
        company_id: sale.company_id, cash_account_id: sale.cash_account_id,
        date: new Date().toISOString().split('T')[0], type: 'egreso', amount: Number(sale.total),
        concept: `Anulación venta — ${sale.customer?.name ?? 'cliente'}`,
        reference_type: 'sale_cancellation', reference_id: sale.id,
      })
    } else if (sale.transaction_type === 'cuenta_corriente' && receivable) {
      await supabase.from('receivables').update({ pending_amount: 0, status: 'cobrado' }).eq('id', receivable.id)
      const { data: cust } = await supabase.from('customers').select('balance').eq('id', receivable.customer_id).single()
      if (cust) {
        await supabase.from('customers').update({ balance: Math.max(0, Number(cust.balance) - Number(receivable.original_amount)) }).eq('id', receivable.customer_id)
      }
    }

    const { data: entries } = await supabase.from('journal_entries').select('id')
      .eq('reference_type', 'sale').eq('reference_id', sale.id).limit(1)
    if (entries && entries.length > 0) {
      const { data: lines } = await supabase.from('journal_entry_lines')
        .select('account_id, debit, credit, description').eq('journal_entry_id', entries[0].id)
      if (lines && lines.length > 0) {
        const { data: rev } = await supabase.from('journal_entries').insert({
          company_id: sale.company_id, date: new Date().toISOString().split('T')[0],
          description: `Anulación: ${sale.customer?.name ?? 'venta'} — Asiento de reversión`,
          entry_type: 'automatico', reference_type: 'sale_cancellation', reference_id: sale.id,
        }).select('id').single()
        if (rev) {
          await supabase.from('journal_entry_lines').insert(
            lines.map((l: any) => ({ journal_entry_id: rev.id, account_id: l.account_id, debit: Number(l.credit), credit: Number(l.debit), description: `[Reversión] ${l.description ?? ''}` }))
          )
        }
      }
    }

    const { error: cancelErr } = await supabase.from('sales').update({ status: 'cancelado' }).eq('id', sale.id)
    setCancelling(false)
    setCancelConfirm(false)
    if (cancelErr) { setCancelError('Error al anular. Recargá la página.') } else { load() }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando comprobante...</div>
  if (!sale) return <div className="p-8 text-center text-red-500">Comprobante no encontrado.</div>

  const ivaRate    = Number(sale.iva_rate ?? 0)
  const ivaAmount  = ivaRate > 0 ? Math.round(Number(sale.total) * ivaRate / (1 + ivaRate) * 100) / 100 : 0
  const netAmount  = Number(sale.total) - ivaAmount
  const iibbRate   = Number(sale.company?.iibb_rate ?? 0)
  const iibbAmount = iibbRate > 0 ? Math.round(netAmount * iibbRate * 100) / 100 : 0
  const nro = sale.doc_number
    ? `0001-${String(sale.doc_number).padStart(8, '0')}`
    : `0001-${String(sale.id).slice(-8).toUpperCase()}`
  const DOC_LABELS: Record<string, { letter: string; label: string }> = {
    factura_a:     { letter: 'A',    label: 'FACTURA A' },
    factura_b:     { letter: 'B',    label: 'FACTURA B' },
    factura_c:     { letter: 'C',    label: 'FACTURA C' },
    nota_debito_a: { letter: 'ND-A', label: 'NOTA DE DÉBITO A' },
    nota_debito_b: { letter: 'ND-B', label: 'NOTA DE DÉBITO B' },
    nota_credito_a:{ letter: 'NC-A', label: 'NOTA DE CRÉDITO A' },
    nota_credito_b:{ letter: 'NC-B', label: 'NOTA DE CRÉDITO B' },
  }
  const docInfo = DOC_LABELS[sale.document_type ?? 'factura_b'] ?? { letter: 'B', label: 'FACTURA B' }

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
          {/* Estado contable */}
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

          {sale.status !== 'cancelado' && !cancelConfirm && (
            <button
              onClick={() => setCancelConfirm(true)}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm rounded-lg hover:bg-red-100 font-medium"
            >
              Anular venta
            </button>
          )}
        </div>
      </div>

      {cancelConfirm && (
        <div className="no-print mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-800 mb-1">¿Confirmar anulación?</p>
          <p className="text-xs text-red-700 mb-3">Esta acción revierte el stock, la tesorería o la cuenta corriente, y genera un asiento contable de reversión. No se puede deshacer.</p>
          {cancelError && <p className="text-sm text-red-700 font-medium mb-3">{cancelError}</p>}
          <div className="flex gap-2">
            <button onClick={cancelSale} disabled={cancelling}
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

      {sale.status === 'cancelado' && (
        <div className="no-print mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-semibold text-center">
          ✕ Esta venta fue anulada — los efectos en stock, tesorería y contabilidad fueron revertidos
        </div>
      )}

      {registered && (
        <div className="no-print mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          ✓ Asiento contable generado correctamente. Incluye IVA Débito Fiscal{iibbAmount > 0 ? ` e Ingresos Brutos (${(iibbRate * 100).toFixed(1)}%)` : ''}.
        </div>
      )}

      {/* Comprobante */}
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm print-area">
        {/* Encabezado */}
        <div className="p-6 border-b border-slate-200 grid grid-cols-2 gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{sale.company?.name ?? 'Empresa'}</h1>
            {sale.company?.cuit && <p className="text-sm text-slate-500 mt-0.5">CUIT: {sale.company.cuit}</p>}
            {sale.company?.address && <p className="text-sm text-slate-500">{sale.company.address}</p>}
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="w-14 h-14 border-2 border-slate-700 rounded-lg flex items-center justify-center mb-1">
              <span className="text-xl font-bold font-mono text-slate-800">{docInfo.letter}</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{docInfo.label}</p>
            <p className="text-base font-bold text-slate-800">Nro: {nro}</p>
            <p className="text-sm text-slate-500">Fecha: {formatDate(sale.date)}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-semibold text-slate-800">{sale.customer?.name ?? '—'}</p>
              {sale.customer?.cuit && <p className="text-slate-500">CUIT: {sale.customer.cuit}</p>}
              {sale.customer?.email && <p className="text-slate-500">{sale.customer.email}</p>}
              {sale.customer?.address && <p className="text-slate-500">{sale.customer.address}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Condiciones</p>
              <p className="text-slate-700 font-medium capitalize">{sale.transaction_type?.replace('_', ' ')}</p>
              {sale.payment_method && <p className="text-slate-500 capitalize">{sale.payment_method}</p>}
              <p className={`text-xs mt-1 font-medium ${sale.status === 'cobrado' ? 'text-green-600' : 'text-orange-600'}`}>
                Estado: {sale.status}
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
            {(sale.items ?? []).map((item: any, i: number) => (
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
                  <span>IVA {(ivaRate * 100).toFixed(1)}%:</span><span>{formatCurrency(ivaAmount)}</span>
                </div>
              </>
            )}
            {iibbAmount > 0 && (
              <div className="flex justify-between text-slate-500 text-xs">
                <span>IIBB {(iibbRate * 100).toFixed(1)}% (s/base imponible):</span><span>{formatCurrency(iibbAmount)}</span>
              </div>
            )}
            <div className={`flex justify-between font-bold text-lg text-slate-800 ${ivaRate > 0 ? 'border-t border-slate-200 pt-2 mt-2' : ''}`}>
              <span>TOTAL:</span><span>{formatCurrency(Number(sale.total))}</span>
            </div>
          </div>
        </div>

        {sale.notes && (
          <div className="px-6 pb-4 text-sm text-slate-500">
            <span className="font-medium">Observaciones:</span> {sale.notes}
          </div>
        )}

        <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100 text-xs text-slate-400 text-center">
          Documento no válido como factura legal — EduERP 360 (herramienta educativa)
        </div>
      </div>
    </>
  )
}
