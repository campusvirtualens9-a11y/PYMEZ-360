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
      <div className="p-5 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{title}</p>
          <p className={cn('text-2xl font-bold', variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-yellow-600' : 'text-slate-800')}>
            {displayValue}
          </p>
          {trend && (
            <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl shadow-sm', variantStyles[variant])}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
