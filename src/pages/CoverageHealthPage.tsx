import { useEffect, useState } from 'react'
import { Activity, CalendarDays, ChevronDown, TriangleAlert } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { periods } from '../data/companyOverview'
import { previewSourcePrototype, projectReportingSources } from '../data/sourcePrototype'
import { useSourcePrototype } from '../data/sourcePrototypeStore'
import { integrationRole } from '../data/integrations'
import { filterCoverageSources, parseCoverageFilters, parseCoverageState, sourceHealth, type SourceHealth } from '../data/coverageHealth'
import { ReportingSources } from '../components/coverage/ReportingSources'
import { SourceDetail } from '../components/coverage/SourceDetail'
import { CollectionIssues, MonitoringLimitations } from '../components/coverage/CoverageSupport'

export function CoverageHealthPage() {
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const state = parseCoverageState(params.get('state'))
  const filters = parseCoverageFilters(params)
  const snapshot = previewSourcePrototype(useSourcePrototype(),params)
  const sources = state === 'empty' ? [] : projectReportingSources(snapshot)
  const visible = filterCoverageSources(sources, filters)
  const busy = loading || state === 'loading'
  const selectedId = params.get('source') ?? (visible.some(source => source.id === 'github') ? 'github' : visible[0]?.id ?? 'none')
  const selected = busy || state === 'error' ? null : visible.find(source => source.id === selectedId) ?? null
  const viewer = integrationRole(params) !== 'Administrator'
  const activeStatuses = (['Healthy', 'Delayed', 'Degraded', 'Disconnected', 'Not Configured'] as SourceHealth[]).filter(status => sources.some(source => sourceHealth(source) === status))
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 180); return () => window.clearTimeout(timer) }, [filters.period, state])
  function update(values: Record<string, string>, replace = false) {
    setParams(() => {
      const next = new URLSearchParams(window.location.search)
      for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key) }
      return next
    }, { replace })
  }
  function filter(values: Record<string, string>) { update({ ...values, source: '' }, 'q' in values) }
  function reset() { update({ q: '', health: '', filter: '', source: '', state: '' }) }
  function revealLimitations() {
    setExpanded(true)
    document.querySelector<HTMLButtonElement>('#monitoring-limitations button')?.focus()
    document.getElementById('monitoring-limitations')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  return <div className="lg:pt-1">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="flex items-start gap-[18px]"><div className="hidden size-[54px] shrink-0 items-center justify-center rounded-xl bg-selected text-accent sm:flex"><Activity size={25} strokeWidth={1.6} aria-hidden="true" /></div><div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Coverage &amp; Health</h1><p className="mt-1 text-[13px] leading-5 text-muted">Monitor data collection coverage, source availability, and ingestion issues.</p></div></div><div className="relative mt-1 w-[200px] shrink-0"><CalendarDays size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5" /><select aria-label="Coverage reporting period" value={filters.period} onChange={event => { setLoading(true); update({ period: event.target.value }) }} className="min-h-11 w-full appearance-none rounded-lg border border-line bg-surface py-2 pl-10 pr-9 text-xs"><option value={7}>Last 7 days</option>{periods.filter(period => period !== 7).map(period => <option key={period} value={period}>Last {period} days</option>)}</select><ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-4 top-4" /></div></header>
    <div aria-label="Source health filters" className="mt-6 flex flex-wrap items-center gap-3">{activeStatuses.map(status => <button type="button" key={status} aria-pressed={filters.health === status} onClick={() => filter({ health: filters.health === status ? '' : status })} className={`inline-flex min-h-[29px] min-w-[128px] items-center gap-1.5 rounded-full px-3 text-xs font-medium ${status === 'Healthy' ? 'bg-selected text-accent' : status === 'Delayed' || status === 'Degraded' ? 'bg-warning-soft text-warning' : 'bg-neutral text-muted'} ${filters.health === status ? 'ring-1 ring-current' : ''}`}>{status === 'Healthy' ? <span aria-hidden="true" className="size-2 rounded-full bg-accent" /> : <TriangleAlert size={12} fill="currentColor" stroke="var(--color-warning-soft)" aria-hidden="true" />}{sources.filter(source => sourceHealth(source) === status).length} {status}</button>)}<p className="ml-2 text-xs text-muted">Telemetry coverage · not test coverage</p>{(filters.health || filters.issuesOnly) && <button type="button" onClick={() => filter({ health: '', filter: '' })} className="rounded px-2 py-1 text-xs text-accent hover:underline">Clear {filters.issuesOnly ? 'issue' : 'health'} filter</button>}</div>
    {viewer && <p role="status" className="mt-3 text-xs text-muted">Read-only demo view. You can inspect and filter monitoring information; no configuration or service changes are available.</p>}
    {state !== 'ready' && !['loading', 'empty', 'error'].includes(state) && <p role="status" className="mt-3 text-xs text-muted">Simulated {state.replace('-', ' ')} preview. The scenario keeps connection configuration and reporting health separate.</p>}
    <div className="mt-[19px] grid items-start gap-4 2xl:grid-cols-[minmax(0,0.68fr)_minmax(0,1fr)]">
      <ReportingSources sources={visible} selectedId={selected?.id ?? null} query={filters.query} busy={busy} error={state === 'error'} onSearch={q => filter({ q })} onSelect={source => update({ source })} onReset={reset} onRetry={() => update({ state: '' })} onLimitations={revealLimitations} />
      <div className="min-w-0 space-y-4"><SourceDetail connectionStatus={snapshot.integrations.find(integration => integration.id === selected?.id)?.status} key={selected?.id ?? 'none'} source={selected} period={filters.period} missing={!busy && state !== 'error' && !selected && selectedId !== 'none' && params.has('source')} onClose={() => { update({ source: 'none' }); document.getElementById(`source-${selected?.id}`)?.focus() }} /><CollectionIssues source={selected} period={filters.period} /><MonitoringLimitations source={selected} period={filters.period} expanded={expanded} onToggle={() => setExpanded(value => !value)} /></div>
    </div>
    <p className="mt-3 text-[10px] leading-5 text-muted">Demo monitoring snapshot · no live integration is connected or checked.</p>
  </div>
}
