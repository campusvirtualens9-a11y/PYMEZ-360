'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createConstitutionJournalEntry } from '@/lib/accounting/entries'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/cn'
import Link from 'next/link'

export default function AperturaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [companyId, setCompanyId]   = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading]       = useState(true)
  const [hasEntries, setHasEntries] = useState(false)
  const [done, setDone]             = useState(false)

  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0])
  const [cashAmount,  setCashAmount]  = useState('')
  const [bankAmount,  setBankAmount]  = useState('')
  const [goodsAmount, setGoodsAmount] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: company } = await supabase
      .from('companies').select('id, name').eq('owner_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single()
    if (!company) { router.push('/companies/new'); return }

    setCompanyId(company.id)
    setCompanyName(company.name ?? '')

    const { count } = await supabase
      .from('journal_entries').select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)

    setHasEntries((count ?? 0) > 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const cash  = parseFloat(cashAmount)  || 0
  const bank  = parseFloat(bankAmount)  || 0
  const goods = parseFloat(goodsAmount) || 0
  const total = cash + bank + goods

  async function handleRegister() {
    if (total === 0) { setError('Ingresá al menos un monto mayor a cero.'); return }
    if (!companyId) return
    setSaving(true); setError('')

    const entryId = await createConstitutionJournalEntry({
      companyId,
      date,
      cashAmount:  cash,
      bankAmount:  bank,
      goodsAmount: goods,
    })

    if (!entryId) {
      setError('No se pudo registrar el asiento. Verificá que el plan de cuentas esté configurado (Caja 1.1.1, Banco 1.1.2, Mercaderías 1.2.1, Capital 3.1.1).')
      setSaving(false)
      return
    }

    // Actualizar saldos de cuentas de tesorería si existen
    if (cash > 0) {
      const { data: cajas } = await supabase
        .from('cash_accounts').select('id, balance').eq('company_id', companyId).eq('type', 'caja').limit(1)
      if (cajas && cajas.length > 0) {
        await supabase.from('cash_accounts').update({ balance: Number(cajas[0].balance) + cash }).eq('id', cajas[0].id)
      }
    }
    if (bank > 0) {
      const { data: bancos } = await supabase
        .from('cash_accounts').select('id, balance').eq('company_id', companyId).eq('type', 'banco').limit(1)
      if (bancos && bancos.length > 0) {
        await supabase.from('cash_accounts').update({ balance: Number(bancos[0].balance) + bank }).eq('id', bancos[0].id)
      }
    }

    setDone(true); setSaving(false)
    setTimeout(() => router.push('/accounting'), 3500)
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/accounting" className="text-slate-400 hover:text-slate-600 text-sm">← Volver</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asiento de Apertura</h1>
          {companyName && <p className="text-slate-500 text-sm">{companyName}</p>}
        </div>
      </div>

      {/* Explicación educativa */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
        <p className="text-sm font-semibold text-blue-800 mb-1">🏛️ El primer paso de toda empresa</p>
        <p className="text-sm text-blue-700">
          El <strong>asiento de apertura</strong> es el punto de partida contable. Registra los recursos con
          que los socios inician la actividad: dinero en efectivo, depósitos bancarios y mercaderías.
          Todos conforman el <strong>Capital Social</strong> — el patrimonio neto inicial de la empresa.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white rounded-lg p-2 text-center border border-blue-200">
            <div className="text-lg">💵</div>
            <div className="font-medium text-blue-800">Efectivo</div>
            <div className="text-blue-600">Activo corriente</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center border border-blue-200">
            <div className="text-lg">🏛️</div>
            <div className="font-medium text-blue-800">Banco</div>
            <div className="text-blue-600">Activo corriente</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center border border-blue-200">
            <div className="text-lg">📦</div>
            <div className="font-medium text-blue-800">Mercaderías</div>
            <div className="text-blue-600">Activo no corriente</div>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          → Contrapartida de todos: <strong>3.1.1 Capital Social (Haber)</strong>
        </p>
      </div>

      {hasEntries && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          ⚠️ Ya existen asientos en el sistema. El asiento de apertura se registrará igualmente — verificá no duplicar datos ya ingresados.
        </div>
      )}

      {done ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-2">
          <div className="text-5xl mb-2">✅</div>
          <p className="text-green-800 font-bold text-lg">¡Asiento de apertura registrado!</p>
          <p className="text-green-700 text-sm">
            DEBE Caja/Banco/Mercaderías {formatCurrency(total)} — HABER Capital Social {formatCurrency(total)}
          </p>
          <p className="text-slate-400 text-xs pt-2">Redirigiendo al Libro Diario...</p>
        </div>
      ) : (
        <>
          {/* Formulario de aportes */}
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-semibold text-slate-800">Aportes iniciales al inicio de actividades</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de constitución / inicio</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Efectivo */}
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-colors">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">💵</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">Efectivo en caja</p>
                  <p className="text-xs text-slate-400">Billetes y monedas entregados por los socios</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">→ DEBE 1.1.1 Caja</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-sm">$</span>
                  <input type="number" value={cashAmount} min="0" step="0.01"
                    onChange={e => setCashAmount(e.target.value)} placeholder="0,00"
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm text-right focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Banco */}
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏛️</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">Depósito bancario inicial</p>
                  <p className="text-xs text-slate-400">Monto depositado en cuenta bancaria al inicio</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">→ DEBE 1.1.2 Banco Cta. Cte.</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-sm">$</span>
                  <input type="number" value={bankAmount} min="0" step="0.01"
                    onChange={e => setBankAmount(e.target.value)} placeholder="0,00"
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm text-right focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Mercaderías */}
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-200 transition-colors">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📦</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">Mercaderías aportadas</p>
                  <p className="text-xs text-slate-400">Valor de inventario inicial aportado por los socios</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">→ DEBE 1.2.1 Mercaderías</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-sm">$</span>
                  <input type="number" value={goodsAmount} min="0" step="0.01"
                    onChange={e => setGoodsAmount(e.target.value)} placeholder="0,00"
                    className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm text-right focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Total Capital Social */}
              {total > 0 && (
                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50">
                  <div className="w-10 h-10 bg-emerald-200 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏦</div>
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-800 text-sm">Capital Social total</p>
                    <p className="text-xs text-emerald-600 font-mono">→ HABER 3.1.1 Capital Social</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(total)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vista previa del asiento */}
          {total > 0 && (
            <Card>
              <CardContent className="space-y-3">
                <h2 className="font-semibold text-slate-800">Vista previa del asiento contable</h2>
                <div className="bg-slate-900 text-green-400 rounded-xl p-4 font-mono text-sm space-y-1.5">
                  <div className="text-slate-500 text-xs mb-3">
                    ┌─ ASIENTO DE APERTURA — {date} ─────────────────┐
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-x-4">
                    {cash > 0 && (
                      <>
                        <span className="text-green-300">DEBE  <span className="text-yellow-300">1.1.1</span> Caja</span>
                        <span className="text-right text-white">{formatCurrency(cash)}</span>
                      </>
                    )}
                    {bank > 0 && (
                      <>
                        <span className="text-green-300">DEBE  <span className="text-yellow-300">1.1.2</span> Banco Cta. Cte.</span>
                        <span className="text-right text-white">{formatCurrency(bank)}</span>
                      </>
                    )}
                    {goods > 0 && (
                      <>
                        <span className="text-green-300">DEBE  <span className="text-yellow-300">1.2.1</span> Mercaderías</span>
                        <span className="text-right text-white">{formatCurrency(goods)}</span>
                      </>
                    )}
                    <div className="col-span-2 border-t border-slate-700 my-1" />
                    <span className="text-red-300 pl-4">HABER <span className="text-yellow-300">3.1.1</span> Capital Social</span>
                    <span className="text-right text-white">{formatCurrency(total)}</span>
                  </div>
                  <div className="text-slate-500 text-xs mt-3">
                    └────────────────────────────────────────────────┘
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Asiento equilibrado: DEBE {formatCurrency(total)} = HABER {formatCurrency(total)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            <Link href="/accounting"><Button variant="outline">Cancelar</Button></Link>
            <Button onClick={handleRegister} loading={saving} disabled={total === 0}>
              📒 Registrar asiento de apertura
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
