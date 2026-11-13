import { useEffect, useState, type KeyboardEvent } from 'react'
import { CalendarDays, ChevronDown, Diamond, Download } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { dailyActivity, periods } from '../data/companyOverview'
import { filterUsageRequests, modelUsage, modelUsageCsv, parseModelSort, parseRequestSort, parseUsageFilters, parseUsageState, sortModelUsage, sortUsageRequests, summarizeUsage, usageRequestPage, usageRequestsCsv, usageTrend, type RequestSortKey, type UsageSortKey } from '../data/usageAndCost'
import { UsageFilters, type UsageExtraFilters } from '../components/usage/UsageFilters'
import { UsageSummary } from '../components/usage/UsageSummary'
import { TokenUsageTrend } from '../components/usage/TokenUsageTrend'
import { ModelUsageTable } from '../components/usage/ModelUsageTable'
import { ModelRequestsTable } from '../components/usage/ModelRequestsTable'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'

const tabs = ['Overview', 'Model Requests'] as const

export function UsageCostPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'Model Requests' ? 'Model Requests' : 'Overview'
  const filters = parseUsageFilters(params)
  const state = parseUsageState(params.get('state'))
  const showPercent = params.get('percent') !== 'off'
  const modelSort = parseModelSort(params.get('modelSort'))
  const modelDescending = params.get('modelDirection') === 'desc'
  const requestSort = parseRequestSort(params.get('requestSort'))
  const requestDescending = params.get('requestDirection') !== 'asc'
  const [loading, setLoading] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const rows = filterUsageRequests(filters, state)
  const summary = summarizeUsage(rows)
  const models = sortModelUsage(modelUsage(rows), modelSort, modelDescending)
  const requests = sortUsageRequests(rows, requestSort, requestDescending)
  const requestPage = usageRequestPage(requests, Number(params.get('page') ?? 1))
  const trend = usageTrend(rows, filters.period)
  const busy = loading || state === 'loading'

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(timeout)
  }, [filters.period, state])

  function changeTab(value: typeof tabs[number]) {
    setParams(() => { const next = new URLSearchParams(window.location.search); next.set('tab', value); next.delete('page'); return next })
    setExportStatus('')
  }
  function tabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : tab === 'Overview' ? 1 : 0
    changeTab(tabs[next])
    document.getElementById(`usage-tab-${next}`)?.focus()
  }
  function changeFilter(key: 'employee' | 'department' | 'model' | 'period', value: string) {
    if (key === 'period') setLoading(true)
    setExportStatus('')
    setParams(() => { const next = new URLSearchParams(window.location.search); if (value) next.set(key, value); else next.delete(key); next.delete('page'); return next })
  }
  function applyMore(values: UsageExtraFilters) {
    setParams(() => {
      const next = new URLSearchParams(window.location.search)
      for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key) }
      next.delete('page')
      return next
    })
    setExportStatus('')
  }
  function resetFilters() { setParams(new URLSearchParams({ tab, period: String(filters.period), percent: showPercent ? 'on' : 'off' })); setExportStatus('') }
  function sortModels(key: UsageSortKey) { setParams(current => { const next = new URLSearchParams(current); next.set('modelSort', key); next.set('modelDirection', key === modelSort && !modelDescending ? 'desc' : 'asc'); return next }) }
  function sortRequests(key: RequestSortKey) { setParams(current => { const next = new URLSearchParams(current); next.set('requestSort', key); next.set('requestDirection', key === requestSort && !requestDescending ? 'desc' : 'asc'); next.delete('page'); return next }) }
  function exportCsv() {
    const data = tab === 'Overview' ? modelUsageCsv(models, filters.period, showPercent) : usageRequestsCsv(requests)
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `menaiq-${tab === 'Overview' ? 'model-usage' : 'model-requests'}-${dailyActivity.at(-filters.period)!.date}-to-${dailyActivity.at(-1)!.date}.csv`
    document.body.append(anchor); anchor.click(); anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setExportStatus(`Exported ${tab === 'Overview' ? models.length + ' models' : requests.length.toLocaleString('en-US') + ' requests'} for the filtered period.`)
  }

  return (
    <div className="lg:-mt-2">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start"><div className="flex items-start gap-[18px]"><div className="hidden size-[62px] shrink-0 items-center justify-center rounded-2xl bg-selected text-success sm:flex"><Diamond size={30} strokeWidth={1.8} aria-hidden="true" /></div><div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Usage &amp; Cost</h1><p className="mt-1 text-base leading-6 text-muted">Analyze AI model usage and estimated cost from the LiteLLM gateway.</p></div></div><div className="flex flex-wrap items-center gap-5 pt-1"><div className="relative w-[218px]"><CalendarDays size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-3.5" /><select aria-label="Usage reporting period" value={filters.period} onChange={event => changeFilter('period', event.target.value)} className="min-h-[46px] w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-11 pr-9 text-sm font-medium">{periods.map(period => <option key={period} value={period}>Last {period} days</option>)}</select><ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-4 top-3.5" /></div><Button variant="secondary" disabled={busy || state === 'error'} onClick={exportCsv} className="min-h-[46px] gap-3 rounded-xl text-base font-semibold text-success [&]:border-green-600 [&]:bg-selected/40 hover:[&]:bg-selected"><Download size={19} aria-hidden="true" />Export</Button></div></header>
      <div role="tablist" aria-label="Usage views" className="mt-5 grid min-h-[38px] w-full max-w-[316px] grid-cols-[1fr_1.15fr] rounded-xl border border-line bg-surface">{tabs.map((item, index) => <button type="button" role="tab" key={item} id={`usage-tab-${index}`} aria-controls="usage-content" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} onClick={() => changeTab(item)} onKeyDown={tabKeys} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${tab === item ? 'bg-success-soft text-success' : 'hover:bg-canvas'}`}>{item}</button>)}</div>
      <div className="mt-4"><UsageFilters filters={filters} onChange={changeFilter} onApply={applyMore} /></div>
      <div id="usage-content" role="tabpanel" aria-labelledby={`usage-tab-${tab === 'Overview' ? 0 : 1}`} tabIndex={0} aria-busy={busy} className="mt-5 rounded-xl">
        {busy ? <Card><LoadingState message="Loading gateway usage…" /></Card> : state === 'error' ? <Card><ErrorState title="Unable to load usage records" description="The prototype could not load local gateway data. Try again to restore sample records." onRetry={() => setParams(current => { const next = new URLSearchParams(current); next.delete('state'); return next }, { replace: true })} /></Card> : rows.length === 0 ? <Card><EmptyState title="No gateway requests found" description="No prototype requests match the selected period and filters." action={<Button variant="secondary" onClick={resetFilters}>Reset filters</Button>} /></Card> : <>
          {state === 'unavailable' && <p role="status" className="mb-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Token measurements and cost estimates are Not Available in this demo state. Request log counts remain available; missing metrics are not zero.</p>}
          <UsageSummary summary={summary} />
          {tab === 'Overview' ? <><div className="mt-[17px]"><TokenUsageTrend days={trend} /></div><div className="mt-[18px]"><ModelUsageTable rows={models} showPercent={showPercent} onToggle={() => setParams(current => { const next = new URLSearchParams(current); next.set('percent', showPercent ? 'off' : 'on'); return next })} sortKey={modelSort} descending={modelDescending} onSort={sortModels} /></div></> : <div className="mt-[18px]"><ModelRequestsTable result={requestPage} period={filters.period} sortKey={requestSort} descending={requestDescending} onSort={sortRequests} onPage={page => setParams(current => { const next = new URLSearchParams(current); next.set('page', String(page)); return next })} /></div>}
        </>}
      </div>
      <p role="status" className="sr-only">{exportStatus}</p>
    </div>
  )
}
