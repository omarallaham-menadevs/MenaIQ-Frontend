import {
  Activity, Building2, CircleCheck, CircleX, Columns2, Diamond, FileText,
  House, LayoutList, LoaderCircle, Menu, Play, Route, Settings,
  TriangleAlert, Unplug, UsersRound, X,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const icons = {
  overview: House, analytics: Columns2, departments: Building2, sessions: Play,
  code: Route, cost: Diamond, security: Diamond, health: Activity,
  users: LayoutList, integrations: Unplug, settings: Settings, audit: Building2,
  menu: Menu, close: X, placeholder: FileText, alert: TriangleAlert,
  loader: LoaderCircle, completed: CircleCheck, interrupted: CircleX, people: UsersRound,
} as const

export type IconName = keyof typeof icons

export function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const Component = icons[name]
  return <Component size={18} strokeWidth={1.7} aria-hidden="true" {...props} />
}
