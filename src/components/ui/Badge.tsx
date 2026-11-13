import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Badge({ className, tone = 'neutral', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium',
      { neutral: 'bg-neutral text-ink', success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger' }[tone],
      className,
    )} {...props} />
  )
}
