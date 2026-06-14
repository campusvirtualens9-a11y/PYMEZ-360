'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateChallengeProgress, awardXp } from '@/lib/gamification/xp'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Product {
  id: string; code: string; name: string; unit: string
  cost_price: number; sale_price: number
  stock_current: number; stock_min: number; category?: string
}

interface Props { products: Product[]; companyId: string; userId: string }

const TYPE_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  entrada: 'success', ajuste: 'warning', salida: 'danger',
}
const TYPE_LABEL: Record<string, string> = {
  entrada: 'Entrada', ajuste: 'Ajuste', salida: 'Salida',
  venta: 'Venta', compra: 'Compra',
}
const REF_HREF: Record<string, string> = {
  sale: '/sales', purchase: '/purchases', manual: '/inventory',
  collection: '/collections', payment: '/payments',
}

export default function InventoryClient({ products, companyId, userId }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'todos' | 'bajo' | 'sin_stock'>('todos')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [adjustModal, setAdjustModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const [kardexModal, setKardexModal] = useState(false)
  const [kardexData, setKardexData] = useState<any[]>([])
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null)
  const [kardexLoading, setKardexLoading] = useState(false)

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category ?? '').filter(Boolean))
    return [...cats].sort()
  }, [products])

  const lowCount = products.filter(
    p => Number(p.stock_current) > 0 && Number(p.stock_current) <= Number(p.stock_min)
  ).length
  const noStockCount = products.filter(p => Number(p.stock_current) === 0).length

  const filtered = useMemo(() => {
    let result = products
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    }
    if (categoryFilter) {
      result = result.filter(p => (p.category ?? '') === categoryFilter)
    }
    if (stockFilter === 'bajo') {
      result = result.filter(p => Number(p.stock_current) > 0 && Number(p.stock_current) <= Number(p.stock_min))
    } else if (stockFilter === 'sin_stock') {
      result = result.filter(p => Number(p.stock_current) === 0)
    }
    return result
  }, [products, search, categoryFilter, stockFilter])

  async function openAdjust(p: Product) {
    setSelectedProduct(p)
    setAdjustQty(Number(p.stock_current))
    setReason('')
    setAdjustModal(true)
  }

  async function handleAdjust() {
    if (!selectedProduct || !reason.trim()) { alert('El motivo del ajuste es obligatorio.'); return }
    setSaving(true)

    await supabase.from('products').update({ stock_current: adjustQty }).eq('id', selectedProduct.id)
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
    setKardexLoading(true)
    setKardexModal(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', p.id)
      .order('date', { ascending: false })
      .limit(50)
    setKardexData(data ?? [])
    setKardexLoading(false)
  }

  return (
    <>
      {/* Alerta stock bajo / sin stock */}
      {(lowCount > 0 || noStockCount > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between text-sm">
          <span className="text-red-700">
            ⚠️{' '}
            <strong>
              {noStockCount > 0 ? `${noStockCount} producto(s) sin stock` : ''}
              {noStockCount > 0 && lowCount > 0 ? ' · ' : ''}
              {lowCount > 0 ? `${lowCount} con stock bajo` : ''}
            </strong>
          </span>
          <Link href="/purchases/new"
            className="text-xs font-medium text-red-700 border border-red-300 rounded-lg px-3 py-1 hover:bg-red-100 transition-colors">
            Reponer mercadería →
          </Link>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
        />

        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          {(['todos', 'bajo', 'sin_stock'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStockFilter(f)}
              className={`px-3 py-2 whitespace-nowrap transition-colors ${
                stockFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              {f === 'todos' ? 'Todos' : f === 'bajo' ? `⚠️ Bajo (${lowCount})` : `❌ Sin stock (${noStockCount})`}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 ml-auto">{filtered.length} de {products.length}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {search || categoryFilter || stockFilter !== 'todos'
                ? 'Sin resultados con los filtros aplicados.'
                : 'No hay productos.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Código</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Producto</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Categoría</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Stock actual</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Stock mín.</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Costo unit.</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Valor total</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Estado</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const stock = Number(p.stock_current)
                    const min = Number(p.stock_min)
                    const noStock = stock === 0
                    const low = !noStock && stock <= min
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-slate-50 ${
                          noStock ? 'bg-red-50' : low ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                        } transition-colors`}>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.code}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-5 py-3 text-slate-600">{p.category ?? '—'}</td>
                        <td className={`px-5 py-3 text-right font-bold text-lg ${
                          noStock ? 'text-red-700' : low ? 'text-amber-600' : 'text-slate-800'
                        }`}>
                          {p.stock_current} <span className="text-xs font-normal text-slate-400">{p.unit}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">{p.stock_min} {p.unit}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatCurrency(Number(p.cost_price))}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800">
                          {formatCurrency(stock * Number(p.cost_price))}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {noStock
                            ? <Badge variant="danger">Sin stock</Badge>
                            : low
                              ? <Badge variant="warning">⚠️ Bajo</Badge>
                              : <Badge variant="success">OK</Badge>
                          }
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openKardex(p)} title="Ver movimientos">📋</Button>
                            <Button variant="ghost" size="sm" onClick={() => openAdjust(p)} title="Ajustar stock">✏️</Button>
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

      {/* Modal ajuste */}
      <Modal open={adjustModal} onClose={() => setAdjustModal(false)} title="Ajuste de stock">
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg text-sm">
            <p className="font-medium text-amber-800">{selectedProduct?.name}</p>
            <p className="text-amber-700 text-xs mt-1">
              Stock actual: <strong>{selectedProduct?.stock_current} {selectedProduct?.unit}</strong>
              {' · '}Mínimo: <strong>{selectedProduct?.stock_min} {selectedProduct?.unit}</strong>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nuevo stock</label>
            <input
              type="number" value={adjustQty} min="0" step="0.001"
              onChange={(e) => setAdjustQty(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
            />
            {adjustQty !== Number(selectedProduct?.stock_current) && (
              <p className="text-xs text-blue-600 mt-1">
                Diferencia: {adjustQty - Number(selectedProduct?.stock_current) > 0 ? '+' : ''}
                {(adjustQty - Number(selectedProduct?.stock_current)).toFixed(3)} {selectedProduct?.unit}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo del ajuste *</label>
            <input
              type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Rotura, merma, conteo físico, error previo..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">El motivo es obligatorio para la auditoría de inventario.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setAdjustModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleAdjust} loading={saving} className="flex-1">Confirmar ajuste</Button>
          </div>
        </div>
      </Modal>

      {/* Modal kardex */}
      <Modal open={kardexModal} onClose={() => setKardexModal(false)} title={`Kardex: ${kardexProduct?.name}`} size="lg">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4 text-sm text-slate-600">
            <span>
              <span className="font-mono text-xs text-slate-400 mr-2">{kardexProduct?.code}</span>
              <strong>{kardexProduct?.name}</strong>
            </span>
            <span className="text-xs">
              Stock actual: <strong>{kardexProduct?.stock_current} {kardexProduct?.unit}</strong>
            </span>
          </div>

          {kardexLoading ? (
            <div className="py-8 text-center text-slate-400">Cargando movimientos...</div>
          ) : kardexData.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">Sin movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Fecha</th>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Tipo</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Cantidad</th>
                    <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Costo unit.</th>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Origen</th>
                    <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Motivo / Ref.</th>
                  </tr>
                </thead>
                <tbody>
                  {kardexData.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">
                        {m.date ?? new Date(m.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={TYPE_BADGE[m.type] ?? 'default'}>
                          {TYPE_LABEL[m.type] ?? m.type}
                        </Badge>
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${
                        m.type === 'salida' ? 'text-red-600'
                          : m.type === 'entrada' ? 'text-green-700'
                            : 'text-amber-700'
                      }`}>
                        {m.type === 'salida' ? '−' : m.type === 'entrada' ? '+' : '↔'}{m.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600 text-xs">
                        {m.unit_cost ? formatCurrency(Number(m.unit_cost)) : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {m.reference_type ? (
                          <Link href={REF_HREF[m.reference_type] ?? '#'}
                            className="text-blue-600 hover:underline capitalize">
                            {m.reference_type}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs max-w-[160px] truncate">
                        {m.reason ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            <Link href="/purchases/new"
              className="text-xs font-medium text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
              + Registrar compra
            </Link>
            <Link href="/purchases"
              className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
              Ver compras →
            </Link>
            <Link href="/sales"
              className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
              Ver ventas →
            </Link>
          </div>
        </div>
      </Modal>
    </>
  )
}
