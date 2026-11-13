import { formatCost } from '../../data/entityAnalytics'
import { usageTokenLabel, type summarizeUsage } from '../../data/usageAndCost'
import { Card } from '../ui/Card'

export function UsageSummary({ summary }: { summary: ReturnType<typeof summarizeUsage> }) {
  const cards = [
    { title: 'Total Tokens', value: usageTokenLabel(summary.measuredTokens), note: summary.missingTokenRequests ? `${summary.missingTokenRequests.toLocaleString('en-US')} token measurements Not Available.` : 'Measured via LiteLLM gateway only.' },
    { title: 'Total Requests', value: summary.requests.toLocaleString('en-US'), note: 'Total observed gateway requests to AI models.' },
    { title: 'Estimated Cost', value: formatCost(summary.estimatedCostCents), note: summary.estimatedCostCents === null ? 'No company-key cost basis available in this scope.' : summary.unpricedRequests ? `Known company-key subtotal; ${summary.unpricedRequests.toLocaleString('en-US')} costs Not Available.` : 'Company-key estimate only; not billed cost.' },
  ]
  return <section aria-label="Usage summary" className="grid gap-[18px] md:grid-cols-3 xl:grid-cols-[1fr_1.03fr_1.16fr]">{cards.map(card => <Card key={card.title} className="min-h-[125px] px-7 py-4"><h2 className="text-sm font-semibold">{card.title}</h2><p className={`mt-1 font-bold leading-10 tracking-tight ${card.value === 'Not Available' ? 'text-2xl text-muted' : 'text-[36px]'}`}>{card.value}</p><p className="mt-1 text-xs leading-5 text-muted">{card.note}</p></Card>)}</section>
}
