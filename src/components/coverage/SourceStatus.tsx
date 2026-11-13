import type { SourceHealth } from '../../data/coverageHealth'
import { Badge } from '../ui/Badge'

export function SourceStatus({ status }: { status: SourceHealth }) {
  return <Badge tone={status === 'Healthy' ? 'success' : status === 'Delayed' || status === 'Degraded' ? 'warning' : 'neutral'} className="min-w-[87px] justify-center [&]:py-1 [&]:text-[11px]">{status}</Badge>
}
