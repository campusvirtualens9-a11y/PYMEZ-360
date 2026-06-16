'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateStock } from '@/lib/inventory/stock'
import { createSaleJournalEntry, getEntryExplanation } from '@/lib/accounting/entries'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EducationalTip } from '@/components/ui/EducationalTip'
import { formatCurrency } from '@/utils/cn'
import type { Customer, Product, CashAccount, TransactionType, PaymentMethod } from '@/types'
import Link from 'next/link'

interface LineItem { productId: string; productName: string; quantity: number; unitPrice: number; costPrice: number }

// ─── Tipos de comprobante de venta (AFIP/ARCA) ───────────────────────────────
const SALE_DOC_TYPES = [
  { value: 'factura_a',    letter: 'A',   label: 'Factura A',    desc: 'RI a RI — requiere CUIT del cliente. IVA discriminado.' },
  { value: 'factura_b',    letter: 'B',   label: 'Factura B',    desc: 'RI a Consumidor Final o Monotributista. IVA no discriminado.' },
  { value: 'factura_c',    letter: 'C',   label: 'Factura C',    desc: 'Monotributista a cualquiera. Sin IVA.' },
  { value: 'nota_debito_a',  letter: 'ND-A', label: 'N. Débito A',  desc: 'Cargo adicional a receptor RI.' },
  { value: 'nota_debito_b',  letter: 'ND-B', label: 'N. Débito B',  desc: 'Cargo adicional a Consumidor Final.' },
  { value: 'nota_credito_a', letter: 'NC-A', label: 'N. Crédito A', desc: 'Devolución o descuento a receptor RI.' },
  { value: 'nota_credito_b', letter: 'NC-B', label: 'N. Crédito B', desc: 'Devolución o descuento a Consumidor Final.' },
]

export default function NewSalePage() {
  const router = useRouter()
  const supabase = createClient()

  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])

  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [transactionType, setTransactionType] = useState<TransactionType>('contado')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [cashAccountId, setCashAccountId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])
  const [ivaRate, setIvaRate] = useState(0.21)
  const [documentType, setDocumentType] = useState('factura_b')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tip, setTip] = useState('')
  const [companyIibbRate, setCompanyIibbRate] = useState(0)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: company } = await supabase
      .from('companies').select('id, iibb_rate').eq('owner_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single()
    if (!company) return
    setCompanyId(company.id)
    setCompanyIibbRate(Number(company.iibb_rate ?? 0))

    const [{ data: cust }, { data: prod }, { data: cash }] = await Promise.all([
      supabase.from('customers').select('*').eq('company_id', company.id).order('name'),
      supabase.from('products').select('*').eq('company_id', company.id).order('name'),
      supabase.from('cash_accounts').select('*').eq('company_id', company.id).order('name'),
    ])

    setCustomers(cust ?? [])
    setProducts(prod ?? [])
    setCashAccounts(cash ?? [])
    if (cash && cash.length > 0) setCashAccountId(cash[0].id)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function addLine() {
    if (products.length === 0) return
    const p = products[0]
    setLines((prev) => [
      ...prev,
      { productId: p.id, productName: p.name, quantity: 1, unitPrice: Number(p.sale_price), costPrice: Number(p.cost_price) },
    ])
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setLines((prev) => {
      const next = [...prev]
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value)
        if (prod) {
          next[idx] = { ...next[idx], productId: prod.id, productName: prod.name, unitPrice: Number(prod.sale_price), costPrice: Number(prod.cost_price) }
        }
      } else {
        next[idx] = { ...next[idx], [field]: value }
      }
      return next
    })
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const totalCost = lines.reduce((s, l) => s + l.quantity * l.costPrice, 0)
  const ivaAmount = ivaRate > 0 ? Math.round(total * ivaRate / (1 + ivaRate) * 100) / 100 : 0
  const netAmount = total - ivaAmount

  async function handleSave() {
    if (!customerId) { setError('Elegí un cliente.'); return }
    if (lines.length === 0) { setError('Agregá al menos un producto.'); return }
    if (transactionType === 'contado' && !cashAccountId) { setError('Elegí la caja/banco para el cobro.'); return }
    if (!companyId || !userId) return

    // ── Validación tipo de factura ──────────────────────────────────────────
    if (documentType === 'factura_a') {
      const c = customers.find(cu => cu.id === customerId)
      if (!c?.cuit) {
        setError('La Factura A requiere que el cliente tenga CUIT registrado (operación entre Responsables Inscriptos). Actualizá los datos del cliente o elegí Factura B.')
        return
      }
    }
    if (documentType === 'factura_c' && ivaRate > 0) {
      setError('La Factura C la emiten Monotributistas, que no discriminan IVA. Cambiá el IVA a "Exento" o elegí Factura A/B.')
      return
    }

    setSaving(true)
    setError('')

    // ── Número correlativo automático ───────────────────────────────────────
    const { data: lastSale } = await supabase
      .from('sales').select('doc_number').eq('company_id', companyId)
      .not('doc_number', 'is', null).order('doc_number', { ascending: false }).limit(1).maybeSingle()
    const nextDocNumber = (lastSale?.doc_number ?? 0) + 1

    // Verificar stock antes de continuar
    for (const l of lines) {
      const prod = products.find((p) => p.id === l.productId)
      if (prod && Number(prod.stock_current) < l.quantity) {
        setError(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock_current}`)
        setSaving(false)
        return
      }
    }

    // 1. Crear venta
    const { data: sale, error: sErr } = await supabase
      .from('sales')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        date,
        total,
        iva_rate: ivaRate,
        document_type: documentType,
        doc_number: nextDocNumber,
        transaction_type: transactionType,
        payment_method: transactionType === 'contado' ? paymentMethod : null,
        cash_account_id: transactionType === 'contado' ? cashAccountId : null,
        status: transactionType === 'contado' ? 'cobrado' : 'pendiente',
        notes,
        created_by: userId,
      })
      .select('id')
      .single()

    if (sErr || !sale) { setError('Error al guardar la venta.'); setSaving(false); return }

    // 2. Items
    await supabase.from('sale_items').insert(
      lines.map((l) => ({
        sale_id: sale.id,
        product_id: l.productId,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        cost_price: l.costPrice,
        subtotal: l.quantity * l.unitPrice,
      }))
    )

    // 3. Reducir stock de cada producto
    for (const l of lines) {
      await updateStock({
        companyId,
        productId: l.productId,
        type: 'salida',
        quantity: l.quantity,
        unitCost: l.costPrice,
        referenceType: 'sale',
        referenceId: sale.id,
        createdBy: userId,
      })
    }

    // 4. Si contado → acreditar caja/banco
    if (transactionType === 'contado') {
      const { data: acct } = await supabase.from('cash_accounts').select('balance').eq('id', cashAccountId).single()
      if (acct) {
        await supabase.from('cash_accounts').update({ balance: Number(acct.balance) + total }).eq('id', cashAccountId)
      }
      await supabase.from('cash_movements').insert({
        company_id: companyId,
        cash_account_id: cashAccountId,
        date,
        type: 'ingreso',
        amount: total,
        concept: `Venta a ${customers.find(c => c.id === customerId)?.name ?? 'cliente'}`,
        reference_type: 'sale',
        reference_id: sale.id,
        created_by: userId,
      })
    } else {
      // Cuenta corriente → cuenta a cobrar y saldo de cliente
      await supabase.from('receivables').insert({
        company_id: companyId,
        sale_id: sale.id,
        customer_id: customerId,
        original_amount: total,
        pending_amount: total,
      })
      const { data: cust } = await supabase.from('customers').select('balance').eq('id', customerId).single()
      if (cust) {
        await supabase.from('customers').update({ balance: Number(cust.balance) + total }).eq('id', customerId)
      }
    }

    // 5. Asiento contable automático
    try {
      await createSaleJournalEntry(
        { id: sale.id, company_id: companyId, date, total, transaction_type: transactionType, iva_rate: ivaRate, iibb_rate: companyIibbRate },
        totalCost
      )
    } catch { /* se puede registrar manualmente desde el comprobante */ }

    // 6. Gamificación
    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'FIRST_SALE' })
    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: transactionType === 'contado' ? 'CASH_SALE' : 'CREDIT_SALE' })
    await awardXp({ profileId: userId, companyId, amount: 20, reason: 'Venta registrada' })

    // 7. Tip educativo y redirección al comprobante
    setTip(getEntryExplanation(transactionType === 'contado' ? 'venta_contado' : 'venta_credito'))
    setSaving(false)

    setTimeout(() => router.push(`/sales/${sale.id}`), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales" className="text-slate-400 hover:text-slate-600">← Volver</Link>
        <h1 className="text-2xl font-bold text-slate-800">Nueva venta</h1>
      </div>

      {tip && <EducationalTip message={tip} onClose={() => setTip('')} />}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* ── Tipo de comprobante ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Tipo de comprobante</h2>
            <span className="text-xs text-slate-400">Se numerará automáticamente</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SALE_DOC_TYPES.slice(0, 4).map(dt => (
              <button key={dt.value} type="button" onClick={() => setDocumentType(dt.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-colors ${
                  documentType === dt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <span className={`text-xl font-bold font-mono w-10 h-10 flex items-center justify-center rounded-lg ${
                  documentType === dt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{dt.letter}</span>
                <span className={`text-xs font-semibold ${documentType === dt.value ? 'text-blue-700' : 'text-slate-700'}`}>{dt.label}</span>
              </button>
            ))}
          </div>
          {/* Notas de débito/crédito */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SALE_DOC_TYPES.slice(4).map(dt => (
              <button key={dt.value} type="button" onClick={() => setDocumentType(dt.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-center transition-colors ${
                  documentType === dt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${
                  documentType === dt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{dt.letter}</span>
                <span className={`text-xs font-medium ${documentType === dt.value ? 'text-blue-700' : 'text-slate-600'}`}>{dt.label}</span>
              </button>
            ))}
          </div>
          {/* Descripción del tipo seleccionado */}
          {(() => {
            const selected = SALE_DOC_TYPES.find(dt => dt.value === documentType)
            if (!selected) return null
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
                <span className="font-bold text-slate-800">{selected.label}:</span>
                <span>{selected.desc}</span>
                {documentType === 'factura_a' && (
                  <span className="ml-auto text-amber-600 font-medium">⚠ Requiere CUIT del cliente</span>
                )}
                {documentType === 'factura_c' && (
                  <span className="ml-auto text-purple-600 font-medium">⚠ IVA debe ser Exento</span>
                )}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="space-y-4">
            <h2 className="font-semibold text-slate-800">Datos de la venta</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm bg-white">
                <option value="">Seleccionar cliente</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de cobro</label>
              <div className="flex gap-2">
                {(['contado', 'cuenta_corriente'] as TransactionType[]).map((t) => (
                  <button key={t} type="button" onClick={() => setTransactionType(t)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      transactionType === t ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}>
                    {t === 'contado' ? '💵 Contado' : '📋 Cuenta corriente'}
                  </button>
                ))}
              </div>
            </div>
            {transactionType === 'contado' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medio de cobro</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm bg-white">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Acreditar en</label>
                  <select value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm bg-white">
                    {cashAccounts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({formatCurrency(Number(c.balance))})</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">IVA</label>
              <div className="flex gap-2">
                {[{ value: 0.21, label: '21%' }, { value: 0.105, label: '10.5%' }, { value: 0, label: 'Exento' }].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setIvaRate(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      ivaRate === opt.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50">
          <CardContent>
            <h2 className="font-semibold text-slate-800 mb-4">Resumen</h2>
            <div className="space-y-2 text-sm">
              {ivaRate > 0 && (
                <>
                  <div className="flex justify-between text-slate-600"><span>Subtotal neto</span><span>{formatCurrency(netAmount)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>IVA {(ivaRate * 100).toFixed(1)}%</span><span>{formatCurrency(ivaAmount)}</span></div>
                </>
              )}
              <div className={`flex justify-between font-bold text-lg text-slate-800 ${ivaRate > 0 ? 'border-t border-slate-200 pt-2 mt-2' : ''}`}>
                <span>Total c/IVA</span><span>{formatCurrency(total)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between text-slate-600 text-xs"><span>Costo</span><span>{formatCurrency(totalCost)}</span></div>
              <div className="flex justify-between text-xs"><span>Margen</span><span className="text-green-600">{formatCurrency(netAmount - totalCost)}</span></div>
              {netAmount > 0 && totalCost > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  Margen s/IVA: {(((netAmount - totalCost) / netAmount) * 100).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="mt-4 bg-green-50 rounded-lg p-3 text-xs text-green-700">
              {transactionType === 'contado'
                ? '💡 Venta de contado: el dinero entra a caja/banco de inmediato y el stock baja.'
                : '💡 Venta a crédito: el stock baja ahora. Cobrás al cliente más adelante.'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Productos vendidos</h2>
            <Button variant="outline" size="sm" onClick={addLine}>+ Agregar producto</Button>
          </div>

          {lines.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
              Hacé clic en "Agregar producto" para incluir ítems en la venta.
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((l, idx) => {
                const prod = products.find((p) => p.id === l.productId)
                const lowStock = prod && Number(prod.stock_current) < l.quantity
                return (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl ${lowStock ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                    <div className="flex-1 min-w-0">
                      <select value={l.productId} onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm bg-white">
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_current} {p.unit})</option>)}
                      </select>
                      {lowStock && <p className="text-xs text-red-500 mt-1">⚠️ Stock insuficiente</p>}
                    </div>
                    <div className="w-20">
                      <input type="number" value={l.quantity} min="0.001" step="0.001"
                        onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm text-right" />
                    </div>
                    <div className="w-28">
                      <input type="number" value={l.unitPrice} min="0" step="0.01"
                        onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm text-right" />
                    </div>
                    <div className="w-28 text-right font-medium text-slate-700 text-sm">
                      {formatCurrency(l.quantity * l.unitPrice)}
                    </div>
                    <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href="/sales"><Button variant="outline">Cancelar</Button></Link>
        <Button onClick={handleSave} loading={saving} disabled={lines.length === 0 || !customerId}>
          Registrar venta
        </Button>
      </div>
    </div>
  )
}
