'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TRIBUTAR_API = 'https://tributar2026nuevo.vercel.app/api/pos-sync'

interface Props {
  companyId: string
  companyName: string
  initialCode: string | null
  initialPosNumber: number | null
  initialPosName: string | null
  initialLinkedAt: string | null
}

export function TributarPosLink({
  companyId,
  companyName,
  initialCode,
  initialPosNumber,
  initialPosName,
  initialLinkedAt,
}: Props) {
  const supabase = createClient()

  const [code, setCode]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [linked, setLinked]     = useState(!!initialLinkedAt)
  const [posNumber, setPosNumber] = useState<number | null>(initialPosNumber)
  const [posName, setPosName]   = useState<string | null>(initialPosName)
  const [linkedCode, setLinkedCode] = useState<string | null>(initialCode)

  async function handleLink() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true)
    setError(null)

    try {
      // 1. Validar que el código existe en TRIBUT.AR
      const valRes = await fetch(`${TRIBUTAR_API}?action=validate&code=${encodeURIComponent(trimmed)}`)
      const valJson = await valRes.json()
      if (!valRes.ok || !valJson.ok) {
        throw new Error(valJson.error ?? 'Código inválido. Verificá en TRIBUT.AR → Puntos de venta.')
      }

      // 2. Registrar la vinculación en TRIBUT.AR
      const linkRes = await fetch(
        `${TRIBUTAR_API}?action=link&code=${encodeURIComponent(trimmed)}&company=${encodeURIComponent(companyName)}`,
      )
      const linkJson = await linkRes.json()
      if (!linkRes.ok || !linkJson.ok) {
        throw new Error(linkJson.error ?? 'Error al registrar la vinculación en TRIBUT.AR.')
      }

      // 3. Guardar en PyMEZ 360
      const now = new Date().toISOString()
      const { error: dbErr } = await (supabase as any)
        .from('companies')
        .update({
          tribut_pos_code:      trimmed,
          tribut_pos_number:    valJson.pos_number,
          tribut_pos_name:      valJson.pos_name,
          tribut_pos_linked_at: now,
        })
        .eq('id', companyId)

      if (dbErr) throw new Error(dbErr.message)

      setLinked(true)
      setLinkedCode(trimmed)
      setPosNumber(valJson.pos_number)
      setPosName(valJson.pos_name)
      setCode('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnlink() {
    if (!linkedCode) return
    setLoading(true)
    setError(null)
    try {
      // Desvincular en TRIBUT.AR
      await fetch(`${TRIBUTAR_API}?action=unlink&code=${encodeURIComponent(linkedCode)}`)

      // Limpiar en PyMEZ 360
      await (supabase as any)
        .from('companies')
        .update({
          tribut_pos_code:      null,
          tribut_pos_number:    null,
          tribut_pos_name:      null,
          tribut_pos_linked_at: null,
        })
        .eq('id', companyId)

      setLinked(false)
      setLinkedCode(null)
      setPosNumber(null)
      setPosName(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desvincular')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {linked ? (
        /* ── Vinculado ──────────────────────────────────────────── */
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800">Ventas habilitadas desde TRIBUT.AR</p>
              <p className="text-xs text-green-700 mt-0.5">
                Punto de venta <strong>N°{posNumber} — {posName}</strong> autorizado.
              </p>
              <p className="text-xs text-green-600 mt-0.5 font-mono">{linkedCode}</p>
            </div>
          </div>
          <button
            onClick={handleUnlink}
            disabled={loading}
            className="mt-3 w-full text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
          >
            {loading ? 'Desvinculando…' : 'Desvincular punto de venta'}
          </button>
        </div>
      ) : (
        /* ── Sin vincular ───────────────────────────────────────── */
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2 text-xs text-slate-600">
            <span>ℹ️</span>
            <p>
              Para registrar ventas necesitás un Punto de Venta habilitado en{' '}
              <strong>TRIBUT.AR</strong>. Obtené el código en{' '}
              <strong>TRIBUT.AR → Puntos de venta</strong> e ingresalo aquí.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="PV1-XXXXXX"
              maxLength={10}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              onClick={handleLink}
              disabled={loading || code.length < 6}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '…' : 'Vincular'}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ✗ {error}
            </p>
          )}

          <p className="text-[10px] text-slate-400">
            El código tiene el formato <span className="font-mono font-semibold">PV1-AB1234</span>.
            Sin Punto de Venta habilitado, las ventas quedarán en estado <em>pendiente de autorización</em>.
          </p>
        </div>
      )}
    </div>
  )
}
