import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, House, TriangleAlert } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { getOverview, parsePeriod, parsePreviewState, periods, type Session } from '../data/companyOverview'
import { SummaryCards } from '../components/overview/SummaryCards'
import { SessionTrend } from '../components/overview/SessionTrend'
import { NeedsAttention } from '../components/overview/NeedsAttention'
import { RecentSessions } from '../components/overview/RecentSessions'
import { SessionDetailDialog } from '../components/overview/SessionDetailDialog'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'

export function CompanyOverviewPage() {
  const [params, setParams] = useSearchParams()
  const period = parsePeriod(params.get('period'))
  const previewState = parsePreviewState(params.get('state'))
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const data = getOverview(period)

  useEffect(() => {
    // Simulated local loading only; no network request or random data.
    const timeout = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(timeout)
  }, [period, previewState])

  function changePeriod(value: string) {
    setLoading(true)
    setSession(null)
    setParams(current => {
      const next = new URLSearchParams(current)
      next.set('period', value)
      return next
    })
  }

  function resetState() {
    setLoading(true)
    setParams(current => {
      const next = new URLSearchParams(current)
      next.delete('state')
      return next
    }, { replace: true })
  }

  const busy = loading || previewState === 'loading'

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="flex items-start gap-[18px]">
          <div className="hidden size-[55px] shrink-0 items-center justify-center rounded-2xl bg-selected text-accent sm:flex"><House size={25} strokeWidth={1.8} aria-hidden="true" /></div>
          <div>
            <h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Company Overview</h1>
            <p className="mt-0.5 max-w-3xl text-[13px] leading-5 text-muted">Monitor AI coding activity, security attention, and collection health across your organization.</p>
          </div>
        </div>
        <div className="relative mt-1.5 w-[202px] shrink-0">
          <CalendarDays size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3" />
          <select aria-label="Reporting period" value={period} onChange={event => changePeriod(event.target.value)} className="min-h-[42px] w-full appearance-none rounded-[10px] border border-line bg-surface py-2 pl-[34px] pr-9 text-[13px] font-medium">
            {periods.map(value => <option key={value} value={value}>Last {value} days</option>)}
          </select>
          <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-3" />
        </div>
      </header>

      <div className="my-6 flex flex-wrap items-center gap-3 text-xs">
        <Badge tone="success" className="min-w-[173px] gap-1.5 py-1.5 text-[11px]"><span className="size-2 rounded-full bg-success" aria-hidden="true" />Collector reporting</Badge>
        <Link to="/coverage-health?filter=issues" className="rounded-full hover:opacity-80"><Badge tone="warning" className="min-w-[179px] gap-1.5 py-1.5 text-[11px]"><TriangleAlert size={12} fill="currentColor" stroke="var(--color-warning-soft)" aria-hidden="true" />{data.collectionIssues} collection issues</Badge></Link>
        <span className="sm:ml-2.5 text-muted">Gateway-only token accounting</span>
      </div>

      <div aria-busy={busy}>
        {busy ? <Card><LoadingState message={`Loading the last ${period} days…`} /></Card> : previewState === 'error' ? (
          <Card><ErrorState title="Unable to load Company Overview" description="The prototype could not load this reporting period. Try again to restore the sample data." onRetry={resetState} /></Card>
        ) : previewState === 'empty' ? (
          <Card><EmptyState title="No activity in this period" description="No AI coding sessions have been recorded for the selected period." action={<Button variant="secondary" onClick={resetState}>Show sample data</Button>} /></Card>
        ) : (
          <div className="space-y-5">
            <SummaryCards data={data} />
            <div className="grid gap-[18px] xl:grid-cols-[2fr_1fr]">
              <SessionTrend days={data.days} period={period} />
              <NeedsAttention criticalFindings={data.criticalFindings} />
            </div>
            <RecentSessions sessions={data.sessions} onSelect={setSession} />
            <p role="status" className="sr-only">Showing {data.totalSessions.toLocaleString('en-US')} sessions over the last {period} days, ending 12 November 2026.</p>
          </div>
        )}
      </div>

      <footer className="mt-[18px] text-[11px] leading-5 text-muted">Prototype data • Tokens are measured via LiteLLM; cost is available only for company-provided API keys.</footer>
      <SessionDetailDialog session={session} onClose={() => setSession(null)} />
    </div>
  )
}
