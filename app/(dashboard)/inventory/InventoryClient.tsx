'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'
import { useRouter } from 'next/navigation'

interface Product { id: string; code: string; name: string; unit: string; cost_price: number; sale_price: number; stock_current: number; stock_min: number; category?: string }

interface Props { products: Product[]; companyId: string; userId: string }

export default function InventoryClient({ products, companyId, userId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [adjustModal, setAdjustModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [kardexModal, setKardexModal] = useState(false)
  const [kardexData, setKardexData] = useState<any[]>([])
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null)

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
  )

  async function openAdjust(p: Product) {
    setSelectedProduct(p)
    setAdjustQty(Number(p.stock_current))
    setReason('')
    setAdjustModal(true)
  }

  async function handleAdjust() {
    if (!selectedProduct || !reason.trim()) { alert('El motivo del ajuste es obligatorio.'); return }
    setSaving(true)

    // Actualizar stock
    await supabase.from('products').update({ stock_current: adjustQty }).eq('id', selectedProduct.id)

    // Registrar movimiento
    await supabase.from('stock_movements').insert({
      company_id: companyId,
      product_id: selectedProduct.id,
      date: new Date().toISOString().split('T')[0],
      type: 'ajuste',
      quantity: adjustQty,
      reason,
      created_by: userId,
    })

    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'ADJUST_STOCK' })
    await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'CHECK_STOCK' })
    await awardXp({ profileId: userId, companyId, amount: 5, reason: 'Ajuste de inventario' })

    setAdjustModal(false)
    setSaving(false)
    router.refresh()
  }

  async function openKardex(p: Product) {
    setKardexProduct(p)
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', p.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setKardexData(data ?? [])
    setKardexModal(true)
  }

  return (
    <>
      <div className="flex gap-3">
        <input type="text" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900" />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No hay productos.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Código</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Producto</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Categoría</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Stock actual</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Stock mínimo</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Costo unit.</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Valor total</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const low = Number(p.stock_current) <= Number(p.stock_min)
                    return (
                      <tr key={p.id} className={`border-b border-slate-50 ${low ? 'bg-red-50/50' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.code}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-5 py-3 text-slate-600">{p.category ?? '—'}</td>
                        <td className={`px-5 py-3 text-right font-bold text-lg ${low ? 'text-red-600' : 'text-slate-800'}`}>
                          {p.stock_current} <span className="text-xs font-normal text-slate-400">{p.unit}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">{p.stock_min} {p.unit}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(Number(p.cost_price))}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(Number(p.stock_current) * Number(p.cost_price))}</td>
                        <td className="px-5 py-3 text-right">
                          {low
                            ? <Badge variant="danger">⚠️ Stock bajo</Badge>
                            : <Badge variant="success">OK</Badge>
                          }
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openKardex(p)}>📋</Button>
                            <Button variant="ghost" size="sm" onClick={() => openAdjust(p)}>✏️</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajuste modal */}
      <Modal open={adjustModal} onClose={() => setAdjustModal(false)} title="Ajuste de stock">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Producto: <strong>{selectedProduct?.name}</strong> · Stock actual: <strong>{selectedProduct?.stock_current} {selectedProduct?.unit}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nuevo stock</label>
            <input type="number" value={adjustQty} min="0" step="0.001"
              onChange={(e) => setAdjustQty(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo del ajuste *</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Rotura, merma, conteo físico, error previo..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            <p className="text-xs text-slate-400 mt-1">El motivo es obligatorio para cualquier ajuste de inventario.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setAdjustModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleAdjust} loading={saving} className="flex-1">Confirmar ajuste</Button>
          </div>
        </div>
      </Modal>

      {/* Kardex modal */}
      <Modal open={kardexModal} onClose={() => setKardexModal(false)} title={`Kardex: ${kardexProduct?.name}`} size="lg">
        <div className="p-5">
          {kardexData.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">Sin movimientos registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Fecha</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Tipo</th>
                  <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Cantidad</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {kardexData.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50">
                    <td className="px-3 py-2 text-slate-600">{new Date(m.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="px-3 py-2">
                      <Badge variant={m.type === 'entrada' ? 'success' : m.type === 'ajuste' ? 'warning' : 'danger'}>
                        {m.type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{m.quantity}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{m.reason ?? m.reference_type ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </>
  )
}
