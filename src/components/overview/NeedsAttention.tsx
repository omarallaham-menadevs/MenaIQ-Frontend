import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

export function NeedsAttention({ criticalFindings }: { criticalFindings: number }) {
  return (
    <Card>
      <h2 className="text-[22px] font-bold leading-7 tracking-tight">Needs Attention</h2>
      <p className="mt-1 text-[13px] text-muted">Items worth reviewing today</p>
      <div className="mt-5 divide-y divide-line">
        <Link to="/security-findings?severity=critical" className="block rounded py-0.5 pb-4 hover:bg-canvas">
          <Badge tone="danger" className="min-w-[182px] px-[18px] py-1.5">{criticalFindings} Critical findings</Badge>
          <p className="mt-1.5 text-[13px] text-muted">Security review needed</p>
        </Link>
        <Link to="/coverage-health?source=litellm" className="block rounded pt-4 hover:bg-canvas">
          <Badge tone="warning" className="min-w-[182px] px-[18px] py-1.5">LiteLLM delayed</Badge>
          <p className="mt-1.5 text-[13px] text-muted">Token usage may be incomplete</p>
        </Link>
      </div>
    </Card>
  )
}
