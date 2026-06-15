import { cn, formatCurrency } from '@/utils/cn'
import { Card } from '@/components/ui/Card'

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  trend?: { value: number; label: string }
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  isCurrency?: boolean
}

const variantStyles = {
  default: 'from-slate-500 to-slate-600',
  success: 'from-green-500 to-green-600',
  warning: 'from-yellow-500 to-yellow-600',
  danger:  'from-red-500 to-red-600',
  info:    'from-blue-600 to-blue-700',
}

export function StatCard({ title, value, icon, trend, variant = 'default', isCurrency = false }: StatCardProps) {
  const displayValue = isCurrency && typeof value === 'number' ? formatCurrency(value) : value

  return (
    <Card className="overflow-hidden">
      <div className="p-3 sm:p-5 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 truncate">{title}</p>
          <p className={cn('text-lg sm:text-2xl font-bold truncate', variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-yellow-600' : 'text-slate-800')}>
            {displayValue}
          </p>
          {trend && (
            <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg sm:text-xl shadow-sm flex-shrink-0', variantStyles[variant])}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
