import { cn } from '@/utils/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn('px-5 py-4 border-b border-slate-100 flex items-center justify-between', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children }: CardProps) {
  return (
    <h3 className={cn('font-semibold text-slate-800 text-base', className)}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children }: CardProps) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  )
}
