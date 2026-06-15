import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PYME 360 — Simulador de Gestión para PyMEs Argentinas',
  description: 'Aprendé a gestionar una PyME real: compras, ventas, cobros, pagos, inventario, contabilidad e impuestos en contexto argentino.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
