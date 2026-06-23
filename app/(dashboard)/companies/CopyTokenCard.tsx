'use client'

import { useState } from 'react'

export function CopyTokenCard({ token }: { token: string | null }) {
  const [copied, setCopied] = useState(false)

  if (!token) return null

  async function copy() {
    await navigator.clipboard.writeText(token!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
          Código de sincronización — TRIBUT.AR
        </p>
        <p className="text-xs text-indigo-500 mb-3">
          Usá este código en TRIBUT.AR para importar tus datos de facturación.
          No lo compartas con otros estudiantes.
        </p>
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-2xl tracking-[0.3em] text-indigo-800 bg-white border border-indigo-200 rounded-xl px-5 py-2 select-all">
            {token}
          </span>
          <button
            onClick={copy}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Instrucciones según régimen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="bg-white border border-indigo-100 rounded-lg p-3 text-xs space-y-1">
          <p className="font-semibold text-purple-700">🏛️ Responsable Inscripto</p>
          <p className="text-slate-500">
            TRIBUT.AR → <strong>Régimen General → IVA</strong> → Sincronizar con PyMEZ 360
          </p>
          <p className="text-slate-400">Importa ventas y compras para calcular débito/crédito fiscal.</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-lg p-3 text-xs space-y-1">
          <p className="font-semibold text-amber-700">🛍️ Monotributista</p>
          <p className="text-slate-500">
            TRIBUT.AR → <strong>Impuestos provinciales → IIBB → Nueva DDJJ</strong> → Importar desde PyMEZ 360
          </p>
          <p className="text-slate-400">Importa el total facturado del mes como base imponible.</p>
        </div>
      </div>
    </div>
  )
}
