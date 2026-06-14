'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { getEntryExplanation } from '@/lib/accounting/entries'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EducationalTip } from '@/components/ui/EducationalTip'
import { formatCurrency } from '@/utils/cn'

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
      supabase.from('payables').select('*, supplier:suppliers(name)').eq('company_id', company.id).neq('status', 'pagado').order('created_at', { ascending: false }),
      supabase.from('cash_accounts').select('*').eq('company_id', company.id).order('name'),
    ])
    setPayables(pay ?? [])
    setCashAccounts(cash ?? [])
    if (cash && cash.length > 0) setCashAccountId(cash[0].id)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

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
      alert('Saldo insuficiente en la caja/banco seleccionada.')
      return
    }

    setSaving(true)

    await supabase.from('payments').insert({
      company_id: companyId, payable_id: selected.id,
      supplier_id: selected.supplier_id, cash_account_id: cashAccountId,
      date: new Date().toISOString().split('T')[0],
      amount, payment_method: paymentMethod, created_by: userId,
    })

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
      date: new Date().toISOString().split('T')[0],
      type: 'egreso', amount, concept: `Pago a proveedor: ${selected.supplier?.name}`,
      reference_type: 'payment', created_by: userId,
    })

    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'FIRST_PAYMENT' })
    await awardXp({ profileId: userId, companyId, amount: 10, reason: 'Pago registrado' })

    setTip(getEntryExplanation('pago'))
    setModalOpen(false)
    setSaving(false)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pagos a proveedores</h1>
        <p className="text-slate-500 text-sm mt-0.5">Pagá las deudas pendientes con tus proveedores.</p>
      </div>

      {tip && <EducationalTip message={tip} onClose={() => setTip('')} />}

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Qué es un pago?</strong> Cuando compraste a cuenta corriente, le debés dinero al proveedor. Acá registrás cuando le pagás, total o parcialmente. El dinero sale de caja/banco y la deuda con el proveedor se reduce.
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : payables.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-slate-500 text-sm">No hay deudas pendientes con proveedores.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Proveedor</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Original</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Pendiente</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                  <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Acción</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.supplier?.name ?? '—'}</td>
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
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar pago">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Proveedor: <strong>{selected?.supplier?.name}</strong> · Deuda: <strong>{formatCurrency(Number(selected?.pending_amount))}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto a pagar</label>
            <input type="number" value={amount} min="0.01" max={selected?.pending_amount ?? 0} step="0.01"
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
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
    </div>
  )
}
