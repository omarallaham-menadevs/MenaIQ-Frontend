import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { dailyActivity, parsePreviewState } from '../data/companyOverview'
import { entitySessions } from '../data/entityAnalytics'
import { detailTabs, filterSessions, getSessionPage, parseSessionFilters, sessionsPageSize, type DetailTab, type SessionFilters as Filters } from '../data/sessions'
import { SessionFilters } from '../components/sessions/SessionFilters'
import { SessionsTable } from '../components/sessions/SessionsTable'
import { SessionDetailsPanel } from '../components/sessions/SessionDetailsPanel'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'

export function SessionsPage() {
  const [params, setParams] = useSearchParams()
  const filters = parseSessionFilters(params)
  const previewState = parsePreviewState(params.get('state'))
  const ascending = params.get('sort') === 'asc'
  const requestedId = params.get('session') ?? 'SES-1082'
  const selectedId = requestedId === 'none' ? null : requestedId
  const tab: DetailTab = detailTabs.find(item => item === params.get('tab')) ?? 'Timeline'
  const [loading, setLoading] = useState(false)
  const rows = previewState === 'empty' ? [] : filterSessions(filters, ascending)
  const index = rows.findIndex(row => row.id === selectedId)
  const requestedPage = params.has('page') ? Number(params.get('page')) : index >= 0 ? Math.floor(index / sessionsPageSize) + 1 : 1
  const result = getSessionPage(rows, requestedPage)
  const selected = index >= 0 ? rows[index] : null
  const existing = selectedId ? entitySessions.find(session => session.id === selectedId) : undefined
  const busy = loading || previewState === 'loading'

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(timeout)
  }, [filters.period, previewState])

  function setFilter(key: 'q' | 'agent' | 'status' | 'period', value: string) {
    if (key === 'period') setLoading(true)
    setParams(current => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      if (!next.has('period')) next.set('period', String(filters.period))
      next.delete('page')
      next.set('session', 'none')
      return next
    }, { replace: key === 'q' })
  }

  function resetFilters(keepSelection = false) {
    setParams(() => {
      const next = new URLSearchParams()
      const targetPeriod = keepSelection && existing && existing.startedAt.slice(0, 10) < dailyActivity.at(-filters.period)!.date ? 90 : filters.period
      next.set('period', String(targetPeriod))
      next.set('session', keepSelection && selectedId ? selectedId : 'none')
      return next
    })
  }

  function selectSession(id: string) {
    setParams(current => {
      const next = new URLSearchParams(current)
      next.set('session', id)
      next.set('period', String(filters.period))
      next.set('page', String(result.page))
      next.delete('tab')
      return next
    })
  }

  function applyMore(values: Pick<Filters, 'employee' | 'repository' | 'device' | 'minDuration'>) {
    setParams(current => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, String(value))
        else next.delete(key)
      }
      next.delete('page')
      next.set('session', 'none')
      if (!next.has('period')) next.set('period', String(filters.period))
      return next
    })
  }

  return (
    <div className="lg:-mt-2">
      <header className="flex items-start gap-[18px]"><div className="hidden size-[62px] shrink-0 items-center justify-center rounded-2xl bg-selected text-success sm:flex"><Play size={28} strokeWidth={2} aria-hidden="true" /></div><div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Sessions</h1><p className="mt-1 text-base leading-6 text-muted">Search and investigate AI coding sessions.</p></div></header>
      <div className="mt-6"><SessionFilters filters={filters} onChange={setFilter} onApplyMore={applyMore} /></div>
      <div aria-busy={busy} className="mt-[34px] grid items-start gap-3.5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {busy ? <Card className="min-w-0 2xl:min-h-[750px]"><LoadingState message="Loading sessions…" /></Card> : previewState === 'error' ? <Card className="min-w-0 2xl:min-h-[750px]"><ErrorState title="Unable to load sessions" description="The prototype could not load the selected sessions. Try again to restore the local sample data." onRetry={() => setParams(current => { const next = new URLSearchParams(current); next.delete('state'); return next }, { replace: true })} /></Card> : <SessionsTable result={result} total={rows.length} selectedId={selected?.id ?? null} ascending={ascending} onSort={() => setParams(current => { const next = new URLSearchParams(current); next.set('sort', ascending ? 'desc' : 'asc'); next.delete('page'); return next })} onPage={page => setParams(current => { const next = new URLSearchParams(current); next.set('page', String(page)); return next })} onSelect={selectSession} onReset={() => resetFilters()} />}
        <SessionDetailsPanel session={busy || previewState !== 'ready' ? null : selected} missing={!busy && previewState === 'ready' && !!selectedId && !existing} filteredOut={!busy && previewState === 'ready' && !!existing && !selected} tab={tab} onTabChange={value => setParams(current => { const next = new URLSearchParams(current); next.set('tab', value); return next })} onClose={() => { setParams(current => { const next = new URLSearchParams(current); next.set('session', 'none'); next.set('period', String(filters.period)); next.delete('tab'); return next }); const trigger = document.getElementById(`session-row-${result.rows.findIndex(row => row.id === selectedId)}`); if (trigger) trigger.focus(); else document.querySelector<HTMLInputElement>('[aria-label="Search sessions"]')?.focus() }} onClearFilters={() => resetFilters(true)} />
      </div>
      <p className="mt-4 text-[11px] leading-5 text-muted">Prototype records · Session totals and pagination reflect the shared dataset within the selected period. No live collection is connected.</p>
    </div>
  )
}

export function SessionRouteRedirect() {
  const { sessionId } = useParams()
  const [params] = useSearchParams()
  const next = new URLSearchParams(params)
  next.set('session', sessionId ?? '')
  return <Navigate replace to={`/sessions?${next}`} />
}
