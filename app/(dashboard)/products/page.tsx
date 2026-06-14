'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateChallengeProgress } from '@/lib/gamification/xp'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'
import type { Product } from '@/types'

const emptyForm = {
  code: '', name: '', description: '', category: '', unit: 'unidad',
  cost_price: 0, sale_price: 0, stock_current: 0, stock_min: 0,
}

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: company } = await supabase
      .from('companies').select('id').eq('owner_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single()
    if (!company) { setLoading(false); return }
    setCompanyId(company.id)

    const { data } = await supabase.from('products').select('*').eq('company_id', company.id).order('name')
    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm, code: `P${String(products.length + 1).padStart(3, '0')}` })
    setError('')
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      code: p.code, name: p.name, description: p.description ?? '', category: p.category ?? '',
      unit: p.unit, cost_price: Number(p.cost_price), sale_price: Number(p.sale_price),
      stock_current: Number(p.stock_current), stock_min: Number(p.stock_min),
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.code.trim()) { setError('El código es obligatorio.'); return }
    if (!companyId) return
    setSaving(true)
    setError('')

    const payload = {
      code: form.code, name: form.name, description: form.description, category: form.category,
      unit: form.unit, cost_price: form.cost_price, sale_price: form.sale_price,
      stock_current: form.stock_current, stock_min: form.stock_min,
    }

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('products').insert({ company_id: companyId, ...payload })
      if (error) {
        setError(error.code === '23505' ? 'Ya existe un producto con ese código.' : error.message)
        setSaving(false)
        return
      }
      if (userId) {
        await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'FIRST_PRODUCT' })
        await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'TEN_PRODUCTS' })
      }
    }

    setModalOpen(false)
    setSaving(false)
    loadData()
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = ['cost_price', 'sale_price', 'stock_current', 'stock_min'].includes(field)
      ? Number(e.target.value)
      : e.target.value
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
  )

  const margin = (p: Product) => {
    const cost = Number(p.cost_price)
    const sale = Number(p.sale_price)
    if (cost === 0 || sale === 0) return null
    return (((sale - cost) / cost) * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Catálogo de productos e insumos de la empresa.</p>
        </div>
        <Button onClick={openNew}>+ Nuevo producto</Button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Para qué sirve el catálogo?</strong> Acá vas a registrar todos los productos que comprás y vendés. Cada producto tiene un precio de costo, un precio de venta y un stock que se actualiza automáticamente con cada operación.
      </div>

      <div className="flex gap-3">
        <input type="text" placeholder="Buscar por nombre o código..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900" />
        <Badge variant="info">{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-slate-500 text-sm">No hay productos en el catálogo.</p>
              <Button onClick={openNew} size="sm" className="mt-4">Agregar primer producto</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Código</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Categoría</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Costo</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Venta</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Margen</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Stock</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const mg = margin(p)
                    const lowStock = Number(p.stock_current) <= Number(p.stock_min)
                    return (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.code}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-5 py-3 text-slate-600">{p.category ?? '—'}</td>
                        <td className="px-5 py-3 text-right text-slate-700">{formatCurrency(Number(p.cost_price))}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(Number(p.sale_price))}</td>
                        <td className="px-5 py-3 text-right">
                          {mg ? <Badge variant={Number(mg) >= 20 ? 'success' : 'warning'}>{mg}%</Badge> : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-bold ${lowStock ? 'text-red-600' : 'text-slate-800'}`}>
                            {p.stock_current} {p.unit}
                          </span>
                          {lowStock && <span className="ml-1 text-xs text-red-400">⚠️</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>✏️</Button>
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

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar producto' : 'Nuevo producto'} size="lg">
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
              <input type="text" value={form.code} onChange={f('code')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm font-mono" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input type="text" value={form.name} onChange={f('name')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <input type="text" value={form.category} onChange={f('category')} placeholder="Ej: Almacén, Bebidas..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
              <select value={form.unit} onChange={f('unit')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm bg-white">
                {['unidad','kg','L','m','m2','m3','caja','bolsa','doc','par'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio de costo</label>
              <input type="number" value={form.cost_price} onChange={f('cost_price')} min="0" step="0.01"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio de venta</label>
              <input type="number" value={form.sale_price} onChange={f('sale_price')} min="0" step="0.01"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock actual</label>
              <input type="number" value={form.stock_current} onChange={f('stock_current')} min="0" step="0.001"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock mínimo (alerta)</label>
              <input type="number" value={form.stock_min} onChange={f('stock_min')} min="0" step="0.001"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
          </div>

          {form.cost_price > 0 && form.sale_price > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              Margen estimado: {(((form.sale_price - form.cost_price) / form.cost_price) * 100).toFixed(1)}%
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Guardar cambios' : 'Agregar producto'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
