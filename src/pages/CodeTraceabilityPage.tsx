import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, GitBranch } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { parsePreviewState, periods } from '../data/companyOverview'
import { filterCommits, filterPullRequests, filterRepositories, filterReviews, parseTraceFilters, traceCommits, tracePage, traceRowId, traceTabs, type DemoCommit, type DemoPullRequest, type TraceTab } from '../data/traceability'
import { TraceDetails, type CommitDetailTab } from '../components/traceability/TraceDetails'
import { TraceTable, type TraceRow } from '../components/traceability/TraceTable'
import { TraceTabs } from '../components/traceability/TraceTabs'
import { TraceToolbar, type TraceExtraFilters } from '../components/traceability/TraceToolbar'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'

export function CodeTraceabilityPage() {
  const [params, setParams] = useSearchParams()
  const tab: TraceTab = traceTabs.find(item => item === params.get('tab')) ?? 'Commits'
  const detailTab: CommitDetailTab = params.get('detail') === 'Related Sessions' ? 'Related Sessions' : 'Details'
  const filters = parseTraceFilters(params)
  const state = parsePreviewState(params.get('state'))
  const [loading, setLoading] = useState(false)
  const selectedId = params.get('row') ?? (tab === 'Commits' ? traceCommits[0].sha : 'none')
  const rows: TraceRow[] = state === 'empty' ? [] : tab === 'Commits' ? filterCommits(filters) : tab === 'Pull Requests' ? filterPullRequests(filters) : tab === 'Reviews' ? filterReviews(filters) : filterRepositories(filters)
  const index = rows.findIndex(row => traceRowId(row) === selectedId || ('shortSha' in row && row.shortSha === selectedId))
  const selected = index >= 0 ? rows[index] : null
  const result = tracePage(rows, params.has('page') ? Number(params.get('page')) : index >= 0 ? Math.floor(index / 10) + 1 : 1)
  const busy = loading || state === 'loading'

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(timer)
  }, [filters.period, state])

  function changeTab(value: TraceTab) {
    setParams(current => { const next = new URLSearchParams(current); next.set('tab', value); next.set('row', 'none'); next.delete('page'); next.delete('detail'); return next })
  }
  function changeFilter(key: 'q' | 'repository' | 'period', value: string) {
    if (key === 'period') setLoading(true)
    setParams(current => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page'); next.set('row', 'none')
      return next
    }, { replace: key === 'q' })
  }
  function applyMore(values: TraceExtraFilters) {
    setParams(current => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key) }
      next.set('row', 'none'); next.delete('page')
      return next
    })
  }
  function resetFilters() { setParams(new URLSearchParams({ tab, period: String(filters.period), row: 'none' })) }
  function selectRow(id: string) {
    setParams(current => { const next = new URLSearchParams(current); next.set('row', id); next.set('page', String(result.page)); next.delete('detail'); return next })
  }
  function goToCommit(commit: DemoCommit) { setParams(new URLSearchParams({ period: String(filters.period), row: commit.sha })) }
  function goToPullRequest(pr: DemoPullRequest) { setParams(new URLSearchParams({ tab: 'Pull Requests', period: String(filters.period), row: String(pr.id) })) }
  function closeDetails() {
    setParams(current => { const next = new URLSearchParams(current); next.set('row', 'none'); next.delete('detail'); return next })
    const localIndex = result.rows.findIndex(row => selected && traceRowId(row) === traceRowId(selected))
    const trigger = document.getElementById(`trace-row-${localIndex}`)
    if (trigger) trigger.focus()
    else document.querySelector<HTMLInputElement>('[aria-label="Search traceability records"]')?.focus()
  }

  return (
    <div className="lg:-mt-2">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="flex items-start gap-[18px]"><div className="hidden size-[62px] shrink-0 items-center justify-center rounded-2xl bg-selected text-success sm:flex"><GitBranch size={29} strokeWidth={1.8} aria-hidden="true" /></div><div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Code Traceability</h1><p className="mt-1 text-base leading-6 text-muted">Explore GitHub activity linked to AI coding sessions.</p></div></div>
        <div className="relative mt-2 w-[208px]"><CalendarDays size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-3" /><select aria-label="Traceability reporting period" value={filters.period} onChange={event => changeFilter('period', event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-9 pr-9 text-sm font-medium">{periods.map(period => <option key={period} value={period}>Last {period} days</option>)}</select><ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3 top-3" /></div>
      </header>
      <div className="mt-6"><TraceToolbar filters={filters} placeholder={tab === 'Commits' ? 'Search commits...' : `Search ${tab.toLowerCase()}...`} onChange={changeFilter} onApply={applyMore} /></div>
      <div className="mt-[22px]"><TraceTabs items={traceTabs} selected={tab} onChange={changeTab} id="trace-main-tab" label="GitHub activity sections" panelId="trace-main-panel" /></div>
      <div id="trace-main-panel" role="tabpanel" aria-labelledby={`trace-main-tab-${traceTabs.indexOf(tab)}`} tabIndex={0} aria-busy={busy} className="mt-[18px] grid items-start gap-[18px] rounded-xl 2xl:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)]">
        {busy ? <Card className="min-w-0 2xl:min-h-[655px]"><LoadingState message="Loading demo GitHub activity…" /></Card> : state === 'error' ? <Card className="min-w-0 2xl:min-h-[655px]"><ErrorState title="Unable to load traceability records" description="The prototype could not load these local demo records. Try again to restore them." onRetry={() => setParams(current => { const next = new URLSearchParams(current); next.delete('state'); return next }, { replace: true })} /></Card> : <TraceTable tab={tab} result={result} selectedId={selected ? traceRowId(selected) : null} onSelect={selectRow} onPage={page => setParams(current => { const next = new URLSearchParams(current); next.set('page', String(page)); return next })} onReset={resetFilters} />}
        <TraceDetails row={busy || state !== 'ready' ? null : selected} tab={tab} detailTab={detailTab} period={filters.period} onDetailTab={value => setParams(current => { const next = new URLSearchParams(current); next.set('detail', value); return next })} onClose={closeDetails} onCommit={goToCommit} onPullRequest={goToPullRequest} />
      </div>
      <p className="mt-4 text-[11px] leading-5 text-muted">Prototype GitHub records · No integration connected. External icons open public example history, not these synthetic SHAs. Verified links refer only to explicit demo evidence.</p>
    </div>
  )
}
