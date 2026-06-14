'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateChallengeProgress } from '@/lib/gamification/xp'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/cn'
import type { Customer } from '@/types'

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', cuit: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!company) { setLoading(false); return }
    setCompanyId(company.id)

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', company.id)
      .order('name')

    setCustomers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditing(null)
    setForm({ name: '', email: '', phone: '', address: '', cuit: '' })
    setError('')
    setModalOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', cuit: c.cuit ?? '' })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!companyId) return
    setSaving(true)
    setError('')

    if (editing) {
      const { error } = await supabase
        .from('customers')
        .update({ name: form.name, email: form.email, phone: form.phone, address: form.address, cuit: form.cuit })
        .eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert({ company_id: companyId, name: form.name, email: form.email, phone: form.phone, address: form.address, cuit: form.cuit })
      if (error) { setError(error.message); setSaving(false); return }

      // Gamificación
      if (userId) {
        await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'FIRST_CUSTOMER' })
        await updateChallengeProgress({ profileId: userId, companyId, challengeCode: 'THREE_CUSTOMERS' })
      }
    }

    setModalOpen(false)
    setSaving(false)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('customers').delete().eq('id', id)
    loadData()
  }

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestioná la cartera de clientes de tu empresa.</p>
        </div>
        <Button onClick={openNew}>+ Nuevo cliente</Button>
      </div>

      {/* Tip educativo */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-sm text-blue-700">
        💡 <strong>¿Para qué sirven los clientes?</strong> Los clientes son las personas o empresas a quienes le vendés. Registrarlos te permite llevar la cuenta corriente de cada uno y saber cuánto te deben.
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
        />
        <Badge variant="info">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-slate-500 text-sm">No hay clientes aún.</p>
              <Button onClick={openNew} size="sm" className="mt-4">Agregar primer cliente</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Teléfono</th>
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">CUIT</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Saldo</th>
                    <th className="text-right px-5 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                      <td className="px-5 py-3 text-slate-600">{c.email ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-600">{c.phone ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-600">{c.cuit ?? '—'}</td>
                      <td className={`px-5 py-3 text-right font-medium ${Number(c.balance) > 0 ? 'text-orange-600' : 'text-slate-700'}`}>
                        {formatCurrency(Number(c.balance))}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>✏️</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="hover:text-red-500">🗑️</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal ABM */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cliente' : 'Nuevo cliente'}>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CUIT</label>
              <input type="text" value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                placeholder="20-12345678-9"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Domicilio</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Agregar cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
