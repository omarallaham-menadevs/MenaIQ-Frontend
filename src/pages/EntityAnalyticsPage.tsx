import { useEffect, useState } from 'react'
import { ChartColumnIncreasing, CalendarDays, ChevronDown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { parsePeriod, parsePreviewState, periods, type Session } from '../data/companyOverview'
import { devices, employees, entityTabs, getEntityAnalytics, parseEntityTab, type EntityTab, type EntityType } from '../data/entityAnalytics'
import { EntityProfile } from '../components/entity/EntityProfile'
import { EntityTabs } from '../components/entity/EntityTabs'
import { EntitySummary } from '../components/entity/EntitySummary'
import { EntitySessionsTable } from '../components/entity/EntitySessionsTable'
import { EntitySecurity, EntityUsage } from '../components/entity/EntitySecondaryTabs'
import { SessionDetailDialog } from '../components/overview/SessionDetailDialog'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'

export function EntityAnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const type: EntityType = params.get('type') === 'device' ? 'device' : 'employee'
  const period = parsePeriod(params.get('period'))
  const tab = parseEntityTab(params.get('tab'))
  const previewState = parsePreviewState(params.get('state'))
  const data = getEntityAnalytics(type, params.get('entity'), period)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(timeout)
  }, [data.entityId, period, type, previewState])

  function updateFilter(key: 'type' | 'entity' | 'period', value: string) {
    setLoading(true)
    setSession(null)
    setParams(current => {
      const next = new URLSearchParams(current)
      next.set(key, value)
      if (key === 'type') next.delete('entity')
      return next
    })
  }

  function selectTab(nextTab: EntityTab) {
    setParams(current => {
      const next = new URLSearchParams(current)
      next.set('tab', nextTab)
      return next
    })
  }

  function viewAllSessions() {
    selectTab('Sessions')
    document.getElementById('entity-tab-1')?.focus()
  }

  function restoreData() {
    setLoading(true)
    setParams(current => {
      const next = new URLSearchParams(current)
      next.delete('state')
      return next
    }, { replace: true })
  }

  const busy = loading || previewState === 'loading'

  return (
    <div className="lg:-mt-2">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="flex items-start gap-[18px]">
          <div className="hidden size-[58px] shrink-0 items-center justify-center rounded-2xl bg-selected text-success sm:flex"><ChartColumnIncreasing size={31} strokeWidth={1.8} aria-hidden="true" /></div>
          <div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Entity Analytics</h1><p className="mt-1 text-base leading-6 text-muted">Explore activity, usage, and security for a specific employee or device.</p></div>
        </div>
        <div className="relative mt-3 w-[207px] shrink-0">
          <CalendarDays size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5" />
          <select aria-label="Entity reporting period" value={period} onChange={event => updateFilter('period', event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-9 pr-9 text-sm font-medium">
            {periods.map(value => <option key={value} value={value}>Last {value} days</option>)}
          </select>
          <ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5" />
        </div>
      </header>

      <div className="mt-[15px] flex min-h-[45px] w-full max-w-[432px] items-center rounded-[14px] border border-line bg-surface">
        <div className="relative w-[161px] shrink-0">
          <select aria-label="Entity type" value={type} onChange={event => updateFilter('type', event.target.value)} className="min-h-10 w-full appearance-none rounded-l-xl bg-transparent py-2 pl-6 pr-9 text-base font-semibold"><option value="employee">Employee</option><option value="device">Device</option></select>
          <ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-5 top-3" />
        </div>
        <div className="relative min-w-0 flex-1 border-l border-muted/60">
          <select aria-label={type === 'employee' ? 'Selected employee' : 'Selected device'} value={data.entityId} onChange={event => updateFilter('entity', event.target.value)} className="min-h-6 w-full appearance-none truncate rounded-r-xl bg-transparent py-0.5 pl-6 pr-9 text-base font-semibold">
            {(type === 'employee' ? employees : devices).map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
          </select>
          <ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-4 top-1" />
        </div>
      </div>

      <div className="mt-[17px]"><EntityProfile key={`${type}-${data.entityId}`} data={data} onTabChange={selectTab} /></div>
      <div className="mt-[18px]"><EntityTabs selected={tab} onChange={selectTab} /></div>

      <section id="entity-tab-panel" role="tabpanel" aria-labelledby={`entity-tab-${entityTabs.indexOf(tab)}`} tabIndex={0} aria-busy={busy} className="mt-5 rounded-xl">
        {busy ? <Card><LoadingState message={`Loading analytics for ${data.name}…`} /></Card> : previewState === 'error' ? (
          <Card><ErrorState title="Unable to load entity analytics" description="The prototype could not load this entity. Try again to restore the sample data." onRetry={restoreData} /></Card>
        ) : previewState === 'empty' ? (
          <Card><EmptyState title="No activity in this period" description="No sessions were recorded for this entity in the selected period." action={<Button variant="secondary" onClick={restoreData}>Show sample data</Button>} /></Card>
        ) : !data.available ? (
          <Card><EmptyState title="Not Available" description="This device is not reporting telemetry. Session, usage, cost, and security information are not available." /></Card>
        ) : (
          <>
            {!data.measured && <p role="status" className="mb-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Measured Tokens and Total Cost are Not Available: gateway measurements are not linked to this device. Session activity is still available.</p>}
            {tab === 'Overview' && <div className="space-y-[26px]"><EntitySummary data={data} /><EntitySessionsTable key={`${data.entityId}-${period}`} data={data} onViewAll={viewAllSessions} onSelect={setSession} /></div>}
            {tab === 'Sessions' && <EntitySessionsTable key={`${data.entityId}-${period}`} data={data} all onViewAll={viewAllSessions} onSelect={setSession} />}
            {tab === 'Usage & Cost' && (data.sessions.length ? <EntityUsage data={data} /> : <Card><EmptyState title="No measured usage" description="No sessions were recorded for this entity in the selected period." /></Card>)}
            {tab === 'Security' && <EntitySecurity data={data} />}
            <p role="status" className="sr-only">Showing analytics for {data.name}, last {period} days ending 12 November 2026. {data.totalSessions} sessions.</p>
          </>
        )}
      </section>
      <SessionDetailDialog session={session} onClose={() => setSession(null)} />
    </div>
  )
}
