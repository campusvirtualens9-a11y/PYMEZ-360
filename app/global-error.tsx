'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Algo se rompió de este lado</h2>
        <p style={{ color: '#475569', marginBottom: 20 }}>
          El error quedó registrado y lo vamos a revisar. Podés recargar la página para seguir trabajando.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', borderRadius: 8, border: 0, background: '#2563eb', color: '#fff', cursor: 'pointer' }}
        >
          Recargar
        </button>
      </body>
    </html>
  )
}
