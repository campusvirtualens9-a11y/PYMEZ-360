'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { createPaymentJournalEntry, getEntryExplanation } from '@/lib/accounting/entries'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EducationalTip } from '@/components/ui/EducationalTip'
import { formatCurrency, formatDate } from '@/utils/cn'

export default function PaymentsPage() {
  const supabase = createClient()
  const [payables, setPayables] = useState<any[]>([])
  const [cashAccounts, setCashAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [amount, setAmount] = useState(0)
  const [cashAccountId, setCashAccountId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [saving, setSaving] = useState(false)
  const [tip, setTip] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [reciboOpen, setReciboOpen] = useState(false)
  const [reciboData, setReciboData] = useState<{
    supplierName: string; amount: number; date: string; paymentMethod: string
    cashAccountName: string; paymentId: string; cashAccountType: string
  } | null>(null)
  const [reciboAccounting, setReciboAccounting] = useState<'idle' | 'loading' | 'done'>('idle')

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single()
    if (!company) { setLoading(false); return }
    setCompanyId(company.id)

    const [{ data: pay }, { data: cash }] = await Promise.all([
      supabase.from('payables')
        .select('*, supplier:suppliers(name), purchase:purchases(date, total, transaction_type)')
        .eq('company_id', company.id)
        .neq('status', 'pagado')
        .order('created_at', { ascending: false }),
      supabase.from('cash_accounts').select('*').eq('company_id', company.id).order('name'),
    ])
    setPayables(pay ?? [])
    setCashAccounts(cash ?? [])
    if (cash && cash.length > 0) setCashAccountId(cash[0].id)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    if (!search.trim()) return payables
    const q = search.toLowerCase()
    return payables.filter(p => p.supplier?.name?.toLowerCase().includes(q))
  }, [payables, search])

  function openPay(payable: any) {
    setSelected(payable)
    setAmount(Number(payable.pending_amount))
    setTip('')
    setModalOpen(true)
  }

  async function handlePay() {
    if (!selected || amount <= 0 || !cashAccountId || !companyId || !userId) return

    const { data: acct } = await supabase.from('cash_accounts').select('balance').eq('id', cashAccountId).single()
    if (acct && Number(acct.balance) < amount) {
      alert(`Saldo insuficiente. Disponible: ${formatCurrency(Number(acct.balance))}`)
      return
    }

    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    const { data: payInsert } = await supabase.from('payments').insert({
      company_id: companyId, payable_id: selected.id,
      supplier_id: selected.supplier_id, cash_account_id: cashAccountId,
      date: today,
      amount, payment_method: paymentMethod, created_by: userId,
    }).select('id').single()

    const newPending = Number(selected.pending_amount) - amount
    await supabase.from('payables').update({
      pending_amount: Math.max(0, newPending),
      status: newPending <= 0 ? 'pagado' : 'pagado_parcial',
    }).eq('id', selected.id)

    const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', selected.supplier_id).single()
    if (sup) {
      await supabase.from('suppliers').update({ balance: Math.max(0, Number(sup.balance) - amount) }).eq('id', selected.supplier_id)
    }

    if (acct) {
      await supabase.from('cash_accounts').update({ balance: Number(acct.balance) - amount }).eq('id', cashAccountId)
    }
    await supabase.from('cash_movements').insert({
      company_id: companyId, cash_account_id: cashAccountId,
      date: today,
      type: 'egreso', amount,
      concept: `Pago a ${selected.supplier?.name ?? 'proveedor'}`,
      reference_type: 'payment', reference_id: payInsert?.id ?? null, created_by: userId,
    })

    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'FIRST_PAYMENT' })
    await awardXp({ profileId: userId, companyId, amount: 10, reason: 'Pago registrado' })

    setTip(getEntryExplanation('pago'))
    setModalOpen(false)
    setSaving(false)

    const selectedCashAccount = cashAccounts.find((c: any) => c.id === cashAccountId)
    setReciboAccounting('idle')
    setReciboData({
      supplierName: selected.supplier?.name ?? '—',
      amount,
      date: today,
      paymentMethod,
      cashAccountName: selectedCashAccount?.name ?? '—',
      paymentId: payInsert?.id ?? '',
      cashAccountType: selectedCashAccount?.type ?? 'caja',
    })
    setReciboOpen(true)
    loadData()
  }

  async function registerPaymentAccounting() {
    if (!reciboData || !companyId || reciboAccounting !== 'idle') return
    setReciboAccounting('loading')
    await createPaymentJournalEntry({
      companyId,
      date: reciboData.date,
      amount: reciboData.amount,
      paymentId: reciboData.paymentId,
      cashAccountType: reciboData.cashAccountType,
      supplierName: reciboData.supplierName,
    })
    setReciboAccounting('done')
  }

  function printRecibo() {
    if (!reciboData) return
    const content = `<html><head><title>Recibo de Pago</title><style>
      body{font-family:sans-serif;padding:30px;max-width:400px;margin:0 auto;}
      h2{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px;}
      .row{display:flex;justify-content:space-between;margin:10px 0;font-size:14px;}
      .total{border-top:2px solid #333;padding-top:10px;font-weight:bold;font-size:18px;margin-top:10px;}
      .footer{font-size:11px;color:#999;text-align:center;margin-top:30px;}
    </style></head><body>
      <h2>RECIBO DE PAGO</h2>
      <div class="row"><span>Proveedor:</span><span><strong>${reciboData.supplierName}</strong></span></div>
      <div class="row"><span>Fecha:</span><span>${reciboData.date}</span></div>
      <div class="row"><span>Medio de pago:</span><span>${reciboData.paymentMethod}</span></div>
      <div class="row"><span>Desde:</span><span>${reciboData.cashAccountName}</span></div>
      <div class="row total"><span>TOTAL PAGADO:</span><span>$${reciboData.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      <div class="footer">EduERP 360 — herramienta educativa. Documento no válido como recibo legal.</div>
    </body></html>`
    const w = window.open('', '_blank', 'width=500,height=650')
    if (!w) return
    w.document.write(content)
    w.document.close()
    w.print()
  }

  // Totales
  const totalPendiente = payables.reduce((s, p) => s + Number(p.pending_amount), 0)
  const totalOriginal  = payables.reduce((s, p) => s + Number(p.original_amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pagos a proveedores</h1>
          <p className="text-slate-500 text-sm mt-0.5">Pagá las deudas pendientes con tus proveedores.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total a pagar</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalPendiente)}</p>
        </div>
      </div>

      {tip && <EducationalTip message={tip} onClose={() => setTip('')} />}

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Qué es un pago?</strong> Cuando compraste a cuenta corriente, le debés dinero al proveedor. Acá registrás cuando le pagás, total o parcialmente. El dinero sale de caja/banco y la deuda con el proveedor se reduce.
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total a pagar</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalPendiente)}</p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Deudas pendientes</p>
          <p className="text-xl font-bold text-slate-800">{payables.length}</p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pagado parcialmente</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalOriginal - totalPendiente)}</p>
        </CardContent></Card>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por proveedor..."
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 w-64"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-sm">
            × Limpiar
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} de {payables.length} resultados</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-slate-500 text-sm">
                {search ? `Sin resultados para "${search}".` : 'No hay deudas pendientes con proveedores.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Proveedor</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Compra original</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Total compra</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Pendiente</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.supplier?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {p.purchase?.date ? (
                        <span>Compra del {formatDate(p.purchase.date)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(Number(p.original_amount))}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-600">{formatCurrency(Number(p.pending_amount))}</td>
                    <td className="px-5 py-3">
                      <Badge variant={p.status === 'pagado_parcial' ? 'warning' : 'danger'}>{p.status?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => openPay(p)}>Pagar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar pago">
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg text-sm">
            <p className="font-medium text-red-800">{selected?.supplier?.name}</p>
            <div className="flex justify-between mt-1 text-xs text-red-700">
              <span>Total original: {formatCurrency(Number(selected?.original_amount))}</span>
              <span>Pendiente: <strong>{formatCurrency(Number(selected?.pending_amount))}</strong></span>
            </div>
            {selected?.purchase?.date && (
              <p className="text-xs text-red-600 mt-1">Compra del {formatDate(selected.purchase.date)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto a pagar</label>
            <input type="number" value={amount} min="0.01" max={selected?.pending_amount ?? 0} step="0.01"
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            {amount > 0 && amount < Number(selected?.pending_amount) && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Pago parcial — quedará pendiente {formatCurrency(Number(selected?.pending_amount) - amount)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Medio de pago</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
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
              {cashAccounts.map((c) => <option key={c.id} value={c.id}>{c.name} ({formatCurrency(Number(c.balance))})</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handlePay} loading={saving} className="flex-1">Confirmar pago</Button>
          </div>
        </div>
      </Modal>

      <Modal open={reciboOpen} onClose={() => setReciboOpen(false)} title="Pago registrado">
        <div className="p-5 space-y-4">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <p className="font-bold text-green-800 text-lg">Pago registrado</p>
            <p className="text-green-700 text-sm mt-1">La operación fue guardada. Podés registrarla en contabilidad ahora.</p>
          </div>
          {reciboData && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Proveedor:</span><span className="font-medium">{reciboData.supplierName}</span></div>
              <div className="flex justify-between text-slate-600"><span>Fecha:</span><span>{reciboData.date}</span></div>
              <div className="flex justify-between text-slate-600"><span>Medio:</span><span className="capitalize">{reciboData.paymentMethod}</span></div>
              <div className="flex justify-between text-slate-600"><span>Desde:</span><span>{reciboData.cashAccountName}</span></div>
              <div className="flex justify-between font-bold text-slate-800 text-lg border-t pt-2 mt-2">
                <span>Total pagado:</span>
                <span>${reciboData.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
          {/* Acción contable */}
          <div className={`p-3 rounded-lg border text-sm ${reciboAccounting === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            {reciboAccounting === 'done' ? (
              <p className="font-medium">✓ Asiento contable registrado — Debe Proveedores / Haber Caja/Banco</p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Asiento contable: pendiente</span>
                <Button
                  size="sm"
                  onClick={registerPaymentAccounting}
                  loading={reciboAccounting === 'loading'}
                >
                  Registrar asiento
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={printRecibo} className="flex-1">Imprimir recibo</Button>
            <Button variant="outline" onClick={() => setReciboOpen(false)} className="flex-1">Cerrar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
