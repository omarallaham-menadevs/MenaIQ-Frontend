import type { getOverview } from '../../data/companyOverview'
import { Card } from '../ui/Card'

export function SummaryCards({ data }: { data: ReturnType<typeof getOverview> }) {
  const cards = [
    { label: 'Total Sessions', value: data.totalSessions.toLocaleString('en-US'), note: 'Supported agent sessions' },
    { label: 'Measured Tokens', value: `${(data.measuredTokens / 1_000_000).toFixed(2)}M`, note: 'LiteLLM gateway only' },
    { label: 'Estimated Cost', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.costCents / 100), note: 'Company-key traffic only' },
    { label: 'Open Security Findings', value: String(data.openFindings), note: `${data.criticalFindings} critical need review`, critical: true },
  ]

  return (
    <section aria-label="Summary" className="grid grid-cols-1 gap-[18px] min-[500px]:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => (
        <Card key={card.label} className="min-h-[136px] px-[22px] py-3">
          <h2 className="text-[15px] font-medium">{card.label}</h2>
          <p className="mt-2 text-[32px] font-bold leading-9 tracking-tight">{card.value}</p>
          <p className={`mt-3 text-[13px] leading-5 ${card.critical ? 'text-danger' : 'text-muted'}`}>{card.note}</p>
        </Card>
      ))}
    </section>
  )
}
