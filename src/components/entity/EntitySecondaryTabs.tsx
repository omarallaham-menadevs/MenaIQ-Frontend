import { formatDay } from '../../data/companyOverview'
import { formatCost, formatTokens, type EntityAnalytics } from '../../data/entityAnalytics'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { EntitySummary } from './EntitySummary'

export function EntityUsage({ data }: { data: EntityAnalytics }) {
  const agents = [...new Set(data.sessions.map(session => session.agent))]
  return <div className="space-y-6">
    <EntitySummary data={data} showSessions={false} />
    <Card className="px-6 py-5">
      <h2 className="text-xl font-bold">Usage by agent</h2>
      <p className="mt-2 text-sm text-muted">Tokens are measured via LiteLLM. Cost includes company-provided API keys only.</p>
      <div className="mt-5 overflow-x-auto" role="region" aria-label="Usage by agent" tabIndex={0}>
        <table className="w-full min-w-[500px] text-left text-sm">
          <caption className="sr-only">Measured usage for {data.name} in the selected period</caption>
          <thead className="bg-neutral"><tr>{['Agent', 'Sessions', 'Measured Tokens', 'Total Cost'].map(title => <th key={title} scope="col" className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{agents.map(agent => {
            const sessions = data.sessions.filter(session => session.agent === agent)
            return <tr key={agent}><th scope="row" className="px-4 py-3 font-medium">{agent}</th><td className="px-4 py-3">{sessions.length}</td><td className="px-4 py-3">{formatTokens(data.measured ? sessions.reduce((sum, session) => sum + session.measuredTokens, 0) : null)}</td><td className="px-4 py-3">{formatCost(data.measured ? sessions.reduce((sum, session) => sum + session.costCents, 0) : null)}</td></tr>
          })}</tbody>
        </table>
      </div>
    </Card>
  </div>
}

export function EntitySecurity({ data }: { data: EntityAnalytics }) {
  return <Card className="px-6 py-5">
    <h2 className="text-xl font-bold">Security</h2>
    <p className="mt-2 text-sm text-muted">Open findings detected for {data.name} in the selected period.</p>
    {data.findings.length === 0 ? <EmptyState title="No open findings" description="No security findings were detected for this entity in the selected period." /> : (
      <ul className="mt-5 divide-y divide-line">{data.findings.map(finding => <li key={finding.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-sm font-medium">{finding.title}</p><p className="mt-1 text-xs text-muted">{finding.id} · <time dateTime={finding.detectedAt}>{formatDay(finding.detectedAt)}</time></p></div><Badge tone={finding.severity === 'Critical' ? 'danger' : finding.severity === 'High' ? 'warning' : 'neutral'}>{finding.severity}</Badge></li>)}</ul>
    )}
  </Card>
}
