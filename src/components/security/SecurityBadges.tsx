import type { Finding } from '../../data/entityAnalytics'
import type { ReviewStatus } from '../../data/securityFindings'
import { Badge } from '../ui/Badge'

export function SeverityBadge({ severity, compact = true }: { severity: Finding['severity']; compact?: boolean }) {
  return <Badge tone={severity === 'Critical' ? 'danger' : severity === 'High' ? 'warning' : 'neutral'} className={`${compact ? '[&]:px-3 [&]:py-0.5 [&]:text-[11px]' : '[&]:px-4 [&]:py-1.5 [&]:text-xs'} ${severity === 'Medium' ? '[&]:bg-[#FFF6D8] [&]:text-[#946000]' : ''}`}>{severity}</Badge>
}
export function ReviewStatusBadge({ status, compact = true }: { status: ReviewStatus; compact?: boolean }) {
  return <Badge tone={status === 'Resolved' ? 'success' : 'neutral'} className={compact ? '[&]:px-3 [&]:py-0.5 [&]:text-[11px]' : '[&]:px-4 [&]:py-1.5 [&]:text-xs'}>{status}</Badge>
}
