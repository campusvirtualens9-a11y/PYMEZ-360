'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'

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
  { href: '/exports',       icon: '📑', label: 'Exportar'         },
  { divider: true },
  { href: '/gamification',  icon: '🎮', label: 'Desafíos'        },
  { href: '/exam',          icon: '🎓', label: 'Examen Final'    },
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
        // mobile: slide in/out; desktop: always visible
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      )}
    >
      {/* Logo */}
      <div className="p-5 border-b border-slate-700 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow">
            E
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">EduERP 360</div>
            <div className="text-slate-500 text-xs">Gestión Educativa</div>
          </div>
        </Link>
        {/* Botón cerrar en mobile */}
        <button
          onClick={onClose}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV_ITEMS.map((item: NavItem, i) => {
          if (item.divider) {
            return <div key={i} className="my-2 border-t border-slate-700/50" />
          }
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5',
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          App educativa · datos ficticios
        </p>
      </div>
    </aside>
  )
}
