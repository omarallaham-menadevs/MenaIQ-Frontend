import type { Session } from '../../data/companyOverview'
import { Badge } from '../ui/Badge'
import { Icon } from '../ui/Icon'
import { CircleAlert } from 'lucide-react'

export function SessionStatus({ status }: { status: Session['status'] }) {
  if (status === 'Failed') return <Badge tone="danger" className="gap-2 px-2.5 py-1"><CircleAlert size={16} aria-hidden="true" />Failed</Badge>
  const completed = status === 'Completed'
  return <Badge tone={completed ? 'success' : 'danger'} className="gap-2 px-2.5 py-1"><Icon name={completed ? 'completed' : 'interrupted'} className="size-4" />{status}</Badge>
}
