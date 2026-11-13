import { formatCost, formatTokens, type EntityAnalytics } from '../../data/entityAnalytics'
import { Card } from '../ui/Card'

export function EntitySummary({ data, showSessions = true }: { data: EntityAnalytics; showSessions?: boolean }) {
  const cards = [
    ...(showSessions ? [{ title: 'Total Sessions', value: data.totalSessions?.toLocaleString('en-US') ?? 'Not Available' }] : []),
    { title: 'Measured Tokens', value: formatTokens(data.measuredTokens) },
    { title: 'Total Cost', value: formatCost(data.costCents) },
  ]
  return (
    <section aria-label="Entity summary" className={`grid gap-[18px] ${showSessions ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
      {cards.map(card => (
        <Card key={card.title} className="min-h-[129px] px-9 py-6">
          <h2 className="text-lg font-semibold tracking-tight">{card.title}</h2>
          <p className={`mt-1.5 font-bold leading-10 tracking-tight ${card.value === 'Not Available' ? 'text-xl text-muted' : 'text-[36px]'}`}>{card.value}</p>
        </Card>
      ))}
    </section>
  )
}
