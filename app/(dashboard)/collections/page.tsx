'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { createCollectionJournalEntry, getEntryExplanation } from '@/lib/accounting/entries'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EducationalTip } from '@/components/ui/EducationalTip'
import { formatCurrency, formatDate } from '@/utils/cn'

export default function CollectionsPage() {
  const supabase = createClient()
  const [receivables, setReceivables] = useState<any[]>([])
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
    customerName: string; amount: number; date: string; paymentMethod: string
    cashAccountName: string; collectionId: string; cashAccountType: string
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

    const [{ data: recv }, { data: cash }] = await Promise.all([
      supabase.from('receivables')
        .select('*, customer:customers(name), sale:sales(date, total, transaction_type)')
        .eq('company_id', company.id)
        .neq('status', 'cobrado')
        .order('created_at', { ascending: false }),
      supabase.from('cash_accounts').select('*').eq('company_id', company.id).order('name'),
    ])
    setReceivables(recv ?? [])
    setCashAccounts(cash ?? [])
    if (cash && cash.length > 0) setCashAccountId(cash[0].id)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    if (!search.trim()) return receivables
    const q = search.toLowerCase()
    return receivables.filter(r => r.customer?.name?.toLowerCase().includes(q))
  }, [receivables, search])

  function openCollect(recv: any) {
    setSelected(recv)
    setAmount(Number(recv.pending_amount))
    setTip('')
    setModalOpen(true)
  }

  async function handleCollect() {
    if (!selected || amount <= 0 || !cashAccountId || !companyId || !userId) return
    setSaving(true)

    const today = new Date().toISOString().split('T')[0]
    const { data: collInsert } = await supabase.from('collections').insert({
      company_id: companyId,
      receivable_id: selected.id,
      customer_id: selected.customer_id,
      cash_account_id: cashAccountId,
      date: today,
      amount,
      payment_method: paymentMethod,
      created_by: userId,
    }).select('id').single()

    const newPending = Number(selected.pending_amount) - amount
    await supabase.from('receivables').update({
      pending_amount: Math.max(0, newPending),
      status: newPending <= 0 ? 'cobrado' : 'cobrado_parcial',
    }).eq('id', selected.id)

    const { data: cust } = await supabase.from('customers').select('balance').eq('id', selected.customer_id).single()
    if (cust) {
      await supabase.from('customers').update({ balance: Math.max(0, Number(cust.balance) - amount) }).eq('id', selected.customer_id)
    }

    const { data: acct } = await supabase.from('cash_accounts').select('balance').eq('id', cashAccountId).single()
    if (acct) {
      await supabase.from('cash_accounts').update({ balance: Number(acct.balance) + amount }).eq('id', cashAccountId)
    }
    await supabase.from('cash_movements').insert({
      company_id: companyId, cash_account_id: cashAccountId,
      date: today,
      type: 'ingreso', amount,
      concept: `Cobro de ${selected.customer?.name ?? 'cliente'}`,
      reference_type: 'collection', reference_id: collInsert?.id ?? null, created_by: userId,
    })

    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'FIRST_COLLECTION' })
    await awardXp({ profileId: userId, companyId, amount: 10, reason: 'Cobro registrado' })

    setTip(getEntryExplanation('cobro'))
    setModalOpen(false)
    setSaving(false)

    const selectedCashAccount = cashAccounts.find((c: any) => c.id === cashAccountId)
    setReciboAccounting('idle')
    setReciboData({
      customerName: selected.customer?.name ?? '—',
      amount,
      date: today,
      paymentMethod,
      cashAccountName: selectedCashAccount?.name ?? '—',
      collectionId: collInsert?.id ?? '',
      cashAccountType: selectedCashAccount?.type ?? 'caja',
    })
    setReciboOpen(true)
    loadData()
  }

  async function registerCollectionAccounting() {
    if (!reciboData || !companyId || reciboAccounting !== 'idle') return
    setReciboAccounting('loading')
    await createCollectionJournalEntry({
      companyId,
      date: reciboData.date,
      amount: reciboData.amount,
      collectionId: reciboData.collectionId,
      cashAccountType: reciboData.cashAccountType,
      customerName: reciboData.customerName,
    })
    setReciboAccounting('done')
  }

  function printRecibo() {
    if (!reciboData) return
    const content = `<html><head><title>Recibo de Cobro</title><style>
      body{font-family:sans-serif;padding:30px;max-width:400px;margin:0 auto;}
      h2{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px;}
      .row{display:flex;justify-content:space-between;margin:10px 0;font-size:14px;}
      .total{border-top:2px solid #333;padding-top:10px;font-weight:bold;font-size:18px;margin-top:10px;}
      .footer{font-size:11px;color:#999;text-align:center;margin-top:30px;}
    </style></head><body>
      <h2>RECIBO DE COBRO</h2>
      <div class="row"><span>Cliente:</span><span><strong>${reciboData.customerName}</strong></span></div>
      <div class="row"><span>Fecha:</span><span>${reciboData.date}</span></div>
      <div class="row"><span>Medio de pago:</span><span>${reciboData.paymentMethod}</span></div>
      <div class="row"><span>Acreditado en:</span><span>${reciboData.cashAccountName}</span></div>
      <div class="row total"><span>TOTAL COBRADO:</span><span>$${reciboData.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>
      <div class="footer">EduERP 360 — herramienta educativa. Documento no válido como recibo legal.</div>
    </body></html>`
    const w = window.open('', '_blank', 'width=500,height=650')
    if (!w) return
    w.document.write(content)
    w.document.close()
    w.print()
  }

  // Totales
  const totalPendiente = receivables.reduce((s, r) => s + Number(r.pending_amount), 0)
  const totalOriginal  = receivables.reduce((s, r) => s + Number(r.original_amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cobros</h1>
          <p className="text-slate-500 text-sm mt-0.5">Cobrá las facturas pendientes de clientes.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total pendiente</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totalPendiente)}</p>
        </div>
      </div>

      {tip && <EducationalTip message={tip} onClose={() => setTip('')} />}

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Qué es un cobro?</strong> Cuando vendiste a cuenta corriente, el cliente te debe dinero. Acá registrás cuando te paga, total o parcialmente. El dinero entra a caja/banco y la deuda del cliente se reduce.
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pendiente de cobrar</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totalPendiente)}</p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Facturas pendientes</p>
          <p className="text-xl font-bold text-slate-800">{receivables.length}</p>
        </CardContent></Card>
        <Card><CardContent>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Cobrado parcialmente</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalOriginal - totalPendiente)}</p>
        </CardContent></Card>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente..."
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 w-64"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-sm">
            × Limpiar
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} de {receivables.length} resultados</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-slate-500 text-sm">
                {search ? `Sin resultados para "${search}".` : 'No hay cuentas pendientes de cobro.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Venta original</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Total venta</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Pendiente</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{r.customer?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {r.sale?.date ? (
                        <span>Venta del {formatDate(r.sale.date)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(Number(r.original_amount))}</td>
                    <td className="px-5 py-3 text-right font-bold text-orange-600">{formatCurrency(Number(r.pending_amount))}</td>
                    <td className="px-5 py-3">
                      <Badge variant={r.status === 'cobrado_parcial' ? 'warning' : 'danger'}>{r.status?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => openCollect(r)}>Cobrar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar cobro">
        <div className="p-5 space-y-4">
          <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg text-sm">
            <p className="font-medium text-orange-800">{selected?.customer?.name}</p>
            <div className="flex justify-between mt-1 text-xs text-orange-700">
              <span>Total original: {formatCurrency(Number(selected?.original_amount))}</span>
              <span>Pendiente: <strong>{formatCurrency(Number(selected?.pending_amount))}</strong></span>
            </div>
            {selected?.sale?.date && (
              <p className="text-xs text-orange-600 mt-1">Venta del {formatDate(selected.sale.date)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto a cobrar</label>
            <input type="number" value={amount} min="0.01" max={selected?.pending_amount ?? 0} step="0.01"
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            {amount > 0 && amount < Number(selected?.pending_amount) && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Cobro parcial — quedará pendiente {formatCurrency(Number(selected?.pending_amount) - amount)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Medio de cobro</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
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
              {cashAccounts.map((c) => <option key={c.id} value={c.id}>{c.name} ({formatCurrency(Number(c.balance))})</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCollect} loading={saving} className="flex-1">Confirmar cobro</Button>
          </div>
        </div>
      </Modal>

      <Modal open={reciboOpen} onClose={() => setReciboOpen(false)} title="Cobro registrado">
        <div className="p-5 space-y-4">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <p className="font-bold text-green-800 text-lg">Cobro registrado</p>
            <p className="text-green-700 text-sm mt-1">La operación fue guardada. Podés registrarla en contabilidad ahora.</p>
          </div>
          {reciboData && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Cliente:</span><span className="font-medium">{reciboData.customerName}</span></div>
              <div className="flex justify-between text-slate-600"><span>Fecha:</span><span>{reciboData.date}</span></div>
              <div className="flex justify-between text-slate-600"><span>Medio:</span><span className="capitalize">{reciboData.paymentMethod}</span></div>
              <div className="flex justify-between text-slate-600"><span>Acreditado en:</span><span>{reciboData.cashAccountName}</span></div>
              <div className="flex justify-between font-bold text-slate-800 text-lg border-t pt-2 mt-2">
                <span>Total cobrado:</span>
                <span>${reciboData.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
          {/* Acción contable */}
          <div className={`p-3 rounded-lg border text-sm ${reciboAccounting === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            {reciboAccounting === 'done' ? (
              <p className="font-medium">✓ Asiento contable registrado — Debe Caja/Banco / Haber Clientes</p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Asiento contable: pendiente</span>
                <Button
                  size="sm"
                  onClick={registerCollectionAccounting}
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
