'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import { LogoPyme } from '@/components/ui/LogoPyme'

const NAV_ITEMS = [
  { href: '/dashboard',     icon: '📊', label: 'Dashboard'       },
  { href: '/companies',     icon: '🏢', label: 'Mi Empresa'      },
  { divider: true },
  { href: '/customers',     icon: '👥', label: 'Clientes'        },
  { href: '/suppliers',     icon: '🏭', label: 'Proveedores'     },
  { href: '/products',      icon: '📦', label: 'Productos'       },
  { divider: true },
  { href: '/purchases',     icon: '🛒', label: 'Compras'         },
  { href: '/sales',         icon: '💰', label: 'Ventas'          },
  { href: '/collections',   icon: '📥', label: 'Cobros'          },
  { href: '/payments',      icon: '📤', label: 'Pagos'           },
  { divider: true },
  { href: '/treasury',      icon: '🏦', label: 'Tesorería'       },
  { href: '/inventory',     icon: '📋', label: 'Inventario'      },
  { href: '/accounting',    icon: '📒', label: 'Contabilidad'    },
  { href: '/taxes',         icon: '🧾', label: 'Impuestos'       },
  { href: '/reports',       icon: '📈', label: 'Reportes'        },
  { href: '/exports',       icon: '📑', label: 'Exportar'        },
  { divider: true },
  { href: '/gamification',  icon: '🎮', label: 'Desafíos'        },
  { href: '/exam',          icon: '🎓', label: 'Examen Final'    },
]

// Apps del ecosistema educativo — enlaces externos
const ECOSYSTEM_APPS = [
  {
    href:    'https://tributar2026nuevo.vercel.app/dashboard',
    icon:    '🏛️',
    label:   'Tribut.ar',
    desc:    'Simulador ARCA/AFIP',
    color:   'text-purple-300 hover:text-purple-100',
    bg:      'hover:bg-purple-900/30',
  },
  {
    href:    'https://sueldos360.vercel.app/dashboard',
    icon:    '👷',
    label:   'Sueldos 360',
    desc:    'Liquidación de haberes',
    color:   'text-teal-300 hover:text-teal-100',
    bg:      'hover:bg-teal-900/30',
  },
]

type NavItem = {
  href?: string
  icon?: string
  label?: string
  divider?: boolean
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full w-[260px] bg-[#0f172a] text-slate-300 flex flex-col z-50 shadow-xl transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      )}
    >
      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-slate-700/60 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <LogoPyme size={36} />
          <div>
            <div className="text-white font-bold text-base leading-tight tracking-tight">PYME 360</div>
            <div className="text-slate-500 text-xs tracking-wide">Gestión educativa</div>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      {/* ── Navegación principal ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 overscroll-contain">
        {NAV_ITEMS.map((item: NavItem, i) => {
          if (item.divider) {
            return <div key={i} className="my-1.5 border-t border-slate-700/40" />
          }
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5',
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
            </Link>
          )
        })}

        {/* ── Apps del ecosistema ───────────────────────────────────── */}
        <div className="mt-2 mb-1 mx-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-2 mb-1">
            Herramientas externas
          </p>
          {ECOSYSTEM_APPS.map(app => (
            <a
              key={app.href}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5',
                app.color, app.bg
              )}
            >
              <span className="text-base leading-none flex-shrink-0">{app.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block leading-tight">{app.label}</span>
                <span className="block text-[10px] opacity-60 leading-tight">{app.desc}</span>
              </span>
              <span className="text-[10px] opacity-40 flex-shrink-0">↗</span>
            </a>
          ))}
        </div>
      </nav>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-slate-700/60 flex-shrink-0 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-600">
          <Link href="/credits" onClick={onClose}
            className="hover:text-slate-400 transition-colors">
            Créditos y T&C
          </Link>
          <span>v1.0 · 2026</span>
        </div>
        <p className="text-[10px] text-slate-600 text-center">
          Simulación educativa · datos ficticios
        </p>
      </div>
    </aside>
  )
}
