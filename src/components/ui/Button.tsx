import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }
export function Button({ className, variant = 'primary', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn('inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', variant === 'primary' && 'bg-accent text-white hover:bg-accent/90', variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-canvas', variant === 'ghost' && 'text-muted hover:bg-canvas hover:text-ink', className)} {...props} />
}
