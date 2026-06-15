'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateStock } from '@/lib/inventory/stock'
import { getEntryExplanation } from '@/lib/accounting/entries'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EducationalTip } from '@/components/ui/EducationalTip'
import { formatCurrency } from '@/utils/cn'
import type { Supplier, Product, CashAccount, TransactionType, PaymentMethod } from '@/types'
import Link from 'next/link'

interface LineItem { productId: string; productName: string; quantity: number; unitPrice: number; costPrice: number }

// ─── Tipos de comprobante recibido (AFIP/ARCA) ──────────────────────────────
const PURCHASE_DOC_TYPES = [
  { value: 'factura_a',     letter: 'A',    label: 'Factura A',    desc: 'Proveedor RI a nosotros (RI). IVA discriminado — genera crédito fiscal.' },
  { value: 'factura_b',     letter: 'B',    label: 'Factura B',    desc: 'Proveedor RI a consumidor final o Monotributista. Sin crédito fiscal.' },
  { value: 'factura_c',     letter: 'C',    label: 'Factura C',    desc: 'Proveedor Monotributista. No discrimina IVA.' },
  { value: 'nota_debito_a', letter: 'ND-A', label: 'N. Débito A',  desc: 'Cargo adicional del proveedor (RI a RI).' },
  { value: 'nota_credito_a',letter: 'NC-A', label: 'N. Crédito A', desc: 'Descuento o devolución del proveedor (RI a RI).' },
]

export default function NewPurchasePage() {
  const router = useRouter()
  const supabase = createClient()

  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])

  const [supplierId, setSupplierId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [transactionType, setTransactionType] = useState<TransactionType>('contado')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [cashAccountId, setCashAccountId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])
  const [ivaRate, setIvaRate] = useState(0.21)
  const [loading, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tip, setTip] = useState('')
  const [documentType, setDocumentType] = useState('factura_a')
  const [supplierDoc, setSupplierDoc] = useState('')

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: company } = await supabase
      .from('companies').select('id').eq('owner_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single()
    if (!company) return
    setCompanyId(company.id)

    const [{ data: sup }, { data: prod }, { data: cash }] = await Promise.all([
      supabase.from('suppliers').select('*').eq('company_id', company.id).order('name'),
      supabase.from('products').select('*').eq('company_id', company.id).order('name'),
      supabase.from('cash_accounts').select('*').eq('company_id', company.id).order('name'),
    ])

    setSuppliers(sup ?? [])
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
      { productId: p.id, productName: p.name, quantity: 1, unitPrice: Number(p.cost_price), costPrice: Number(p.cost_price) },
    ])
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setLines((prev) => {
      const next = [...prev]
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value)
        if (prod) {
          next[idx] = { ...next[idx], productId: prod.id, productName: prod.name, unitPrice: Number(prod.cost_price), costPrice: Number(prod.cost_price) }
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
  const ivaAmount = ivaRate > 0 ? Math.round(total * ivaRate / (1 + ivaRate) * 100) / 100 : 0
  const netAmount = total - ivaAmount

  async function handleSave() {
    if (!supplierId) { setError('Elegí un proveedor.'); return }
    if (lines.length === 0) { setError('Agregá al menos un producto.'); return }
    if (transactionType === 'contado' && !cashAccountId) { setError('Elegí la caja/banco para el pago.'); return }
    if (!companyId || !userId) return

    // Validaciones de tipo de comprobante
    if (documentType === 'factura_a') {
      const s = suppliers.find(su => su.id === supplierId)
      if (!s?.cuit) {
        setError('La Factura A requiere que el proveedor tenga CUIT registrado (operación entre Responsables Inscriptos). Actualizá los datos del proveedor o elegí Factura B.')
        return
      }
    }
    if (documentType === 'factura_c' && ivaRate > 0) {
      setError('La Factura C la emiten Monotributistas, que no discriminan IVA. Cambiá el IVA a "Exento" o elegí Factura A/B.')
      return
    }

    // Verificar saldo suficiente antes de procesar (evita saldo negativo)
    if (transactionType === 'contado') {
      const { data: acctPre } = await supabase.from('cash_accounts').select('balance').eq('id', cashAccountId).single()
      if (!acctPre || Number(acctPre.balance) < total) {
        setError(`Saldo insuficiente en la cuenta seleccionada. Disponible: ${formatCurrency(Number(acctPre?.balance ?? 0))} — Necesitás: ${formatCurrency(total)}`)
        return
      }
    }

    setSaving(true)
    setError('')

    const { data: lastPurchase } = await supabase
      .from('purchases').select('doc_number').eq('company_id', companyId)
      .not('doc_number', 'is', null).order('doc_number', { ascending: false }).limit(1).maybeSingle()
    const nextDocNumber = (lastPurchase?.doc_number ?? 0) + 1

    // 1. Crear compra
    const { data: purchase, error: pErr } = await supabase
      .from('purchases')
      .insert({
        company_id: companyId,
        supplier_id: supplierId,
        date,
        total,
        iva_rate: ivaRate,
        transaction_type: transactionType,
        payment_method: transactionType === 'contado' ? paymentMethod : null,
        cash_account_id: transactionType === 'contado' ? cashAccountId : null,
        status: transactionType === 'contado' ? 'pagado' : 'pendiente',
        notes,
        created_by: userId,
        document_type: documentType,
        doc_number: nextDocNumber,
        supplier_doc: supplierDoc || null,
      })
      .select('id')
      .single()

    if (pErr || !purchase) { setError('Error al guardar la compra.'); setSaving(false); return }

    // 2. Items
    await supabase.from('purchase_items').insert(
      lines.map((l) => ({
        purchase_id: purchase.id,
        product_id: l.productId,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        subtotal: l.quantity * l.unitPrice,
      }))
    )

    // 3. Actualizar stock de cada producto
    for (const l of lines) {
      await updateStock({
        companyId,
        productId: l.productId,
        type: 'entrada',
        quantity: l.quantity,
        unitCost: l.unitPrice,
        referenceType: 'purchase',
        referenceId: purchase.id,
        createdBy: userId,
      })
    }

    // 4. Si contado → descontar caja/banco y registrar movimiento
    if (transactionType === 'contado') {
      const { data: acct } = await supabase.from('cash_accounts').select('balance').eq('id', cashAccountId).single()
      if (acct) {
        await supabase.from('cash_accounts').update({ balance: Number(acct.balance) - total }).eq('id', cashAccountId)
      }
      await supabase.from('cash_movements').insert({
        company_id: companyId,
        cash_account_id: cashAccountId,
        date,
        type: 'egreso',
        amount: total,
        concept: `Compra a ${suppliers.find(s => s.id === supplierId)?.name ?? 'proveedor'}`,
        reference_type: 'purchase',
        reference_id: purchase.id,
        created_by: userId,
      })
    } else {
      // Cuenta corriente → generar cuenta a pagar y actualizar saldo proveedor
      await supabase.from('payables').insert({
        company_id: companyId,
        purchase_id: purchase.id,
        supplier_id: supplierId,
        original_amount: total,
        pending_amount: total,
      })
      const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', supplierId).single()
      if (sup) {
        await supabase.from('suppliers').update({ balance: Number(sup.balance) + total }).eq('id', supplierId)
      }
    }

    // 5. Gamificación
    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'FIRST_PURCHASE' })
    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: transactionType === 'contado' ? 'CASH_PURCHASE' : 'CREDIT_PURCHASE' })
    await awardXp({ profileId: userId, companyId, amount: 15, reason: 'Compra registrada' })

    // 6. Tip educativo y redirección al comprobante
    setTip(getEntryExplanation(transactionType === 'contado' ? 'compra_contado' : 'compra_credito'))
    setSaving(false)

    setTimeout(() => router.push(`/purchases/${purchase.id}`), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchases" className="text-slate-400 hover:text-slate-600">← Volver</Link>
        <h1 className="text-2xl font-bold text-slate-800">Nueva compra</h1>
      </div>

      {tip && <EducationalTip message={tip} onClose={() => setTip('')} />}

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* ── Tipo de comprobante recibido ─────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Tipo de comprobante recibido</h2>
            <span className="text-xs text-slate-400">Se numerará internamente</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {PURCHASE_DOC_TYPES.map(dt => (
              <button key={dt.value} type="button" onClick={() => setDocumentType(dt.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-center transition-colors ${
                  documentType === dt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <span className={`text-xs font-bold font-mono px-2 py-1 rounded w-full text-center ${
                  documentType === dt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{dt.letter}</span>
                <span className={`text-xs font-medium leading-tight ${documentType === dt.value ? 'text-blue-700' : 'text-slate-600'}`}>{dt.label}</span>
              </button>
            ))}
          </div>
          {(() => {
            const selected = PURCHASE_DOC_TYPES.find(dt => dt.value === documentType)
            if (!selected) return null
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-800">{selected.label}:</span>
                <span>{selected.desc}</span>
                {documentType === 'factura_a' && (
                  <span className="ml-auto text-amber-600 font-medium">⚠ Requiere CUIT del proveedor</span>
                )}
                {documentType === 'factura_c' && (
                  <span className="ml-auto text-purple-600 font-medium">⚠ IVA debe ser Exento</span>
                )}
              </div>
            )
          })()}
          {/* Nro del proveedor */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nro de comprobante del proveedor <span className="font-normal text-slate-400">(opcional — para conciliación)</span>
            </label>
            <input type="text" value={supplierDoc} onChange={e => setSupplierDoc(e.target.value)}
              placeholder="ej. 0001-00012345"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Proveedor */}
        <Card>
          <CardContent className="space-y-4">
            <h2 className="font-semibold text-slate-800">Datos de la compra</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm bg-white">
                <option value="">Seleccionar proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de pago</label>
              <div className="flex gap-2">
                {(['contado', 'cuenta_corriente'] as TransactionType[]).map((t) => (
                  <button key={t} type="button" onClick={() => setTransactionType(t)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      transactionType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}>
                    {t === 'contado' ? '💵 Contado' : '📋 Cuenta corriente'}
                  </button>
                ))}
              </div>
            </div>
            {transactionType === 'contado' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medio de pago</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm bg-white">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Desde caja/banco</label>
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
                      ivaRate === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
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
              <div className="flex justify-between text-xs text-slate-500 border-t border-slate-200 pt-2 mt-1">
                <span>Tipo de pago</span><span>{transactionType === 'contado' ? 'Inmediato' : 'A crédito'}</span>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              {transactionType === 'contado'
                ? '💡 Compra de contado: el dinero sale de caja/banco inmediatamente y el stock sube.'
                : '💡 Compra a crédito: el stock sube ahora, pero pagás al proveedor más adelante.'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productos */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Productos comprados</h2>
            <Button variant="outline" size="sm" onClick={addLine}>+ Agregar producto</Button>
          </div>

          {lines.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
              Hacé clic en "Agregar producto" para incluir ítems en la compra.
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <select value={l.productId}
                      onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm bg-white">
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
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
              ))}
              <div className="text-xs text-slate-400 flex gap-4 px-3">
                <span className="flex-1">Producto</span>
                <span className="w-20 text-right">Cantidad</span>
                <span className="w-28 text-right">Precio unit.</span>
                <span className="w-28 text-right">Subtotal</span>
                <span className="w-4" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        <Link href="/purchases">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button onClick={handleSave} loading={loading} disabled={lines.length === 0 || !supplierId}>
          Registrar compra
        </Button>
      </div>
    </div>
  )
}
