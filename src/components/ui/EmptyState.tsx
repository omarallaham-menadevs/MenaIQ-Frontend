import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function EmptyState({ title = 'Nothing here yet', description, icon = 'placeholder', action }: { title?: string; description?: string; icon?: IconName; action?: ReactNode }) {
  return <div className="flex flex-col items-center px-4 py-16 text-center sm:py-24"><div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-line bg-canvas text-muted"><Icon name={icon} className="size-6" /></div><h2 className="text-base font-medium">{title}</h2>{description && <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>}{action && <div className="mt-6">{action}</div>}</div>
}
