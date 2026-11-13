import type { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { employees } from '../../data/entityAnalytics'
import { formatActivity } from '../../data/companyOverview'
import { securityStatuses, type SecurityFilters, type securityPage } from '../../data/securityFindings'
import { getPaginationItems } from '../../data/sessions'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { LoadingState } from '../ui/LoadingState'
import { SeverityBadge, ReviewStatusBadge } from './SecurityBadges'
import { SecurityQueueFilters, type SecurityExtraFilters } from './SecurityQueueFilters'

export function FindingsQueue({ result, selectedId, filters, counts, busy, error, onFilter, onMoreFilters, onSelect, onPage, onReset, onRetry }: { result: ReturnType<typeof securityPage>; selectedId: string | null; filters: SecurityFilters; counts: Record<'All' | typeof securityStatuses[number], number>; busy: boolean; error: boolean; onFilter: (key: 'q' | 'severity' | 'agent' | 'status', value: string) => void; onMoreFilters: (values: SecurityExtraFilters) => void; onSelect: (id: string) => void; onPage: (page: number) => void; onReset: () => void; onRetry: () => void }) {
  function keyNavigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowDown' ? Math.min(result.rows.length - 1, index + 1) : event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? result.rows.length - 1 : null
    if (next === null) return
    event.preventDefault(); onSelect(result.rows[next].id); document.getElementById(`finding-row-${next}`)?.focus()
  }
  return <Card className="flex min-w-0 flex-col px-5 py-5 2xl:min-h-[776px]">
    <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold leading-7">Findings Queue</h2><span className="text-xs text-muted">{result.total} findings</span></div>
    <div className="relative mt-6"><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-muted" /><input type="search" aria-label="Search security findings" placeholder="Search findings, IDs, or sessions..." value={filters.query} onChange={event => onFilter('q', event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-xs placeholder:text-muted" /></div>
    <div className="mt-3"><SecurityQueueFilters filters={filters} onFilter={onFilter} onApply={onMoreFilters} /></div>
    <div role="group" aria-label="Finding review status" className="mt-3 grid grid-cols-[0.8fr_0.9fr_1.2fr_1fr] gap-2">{(['All', ...securityStatuses] as const).map(status => <button key={status} type="button" aria-pressed={filters.status === status} onClick={() => onFilter('status', status === 'All' ? '' : status)} className={`min-h-[30px] rounded-full px-2 text-[11px] font-medium ${filters.status === status ? 'bg-accent text-white' : 'bg-canvas hover:bg-neutral'}`}>{status} ({counts[status]})</button>)}</div>
    <div aria-busy={busy} className="mt-5">
      {busy ? <LoadingState message="Loading security findings…" /> : error ? <ErrorState title="Unable to load findings" description="The local prototype could not load this queue. Try again to restore sample records." onRetry={onRetry} /> : result.total === 0 ? <EmptyState title="No findings match" description="No demo findings match this period and the active filters." action={<Button variant="secondary" onClick={onReset}>Reset filters</Button>} /> : <ul aria-label="Security findings queue" className="space-y-1">{result.rows.map((finding, index) => {
        const selected = finding.id === selectedId
        const employee = employees.find(item => item.id === finding.employeeId)!
        const color = finding.severity === 'Critical' ? 'bg-danger-soft text-danger' : finding.severity === 'High' ? 'bg-warning-soft text-warning' : 'bg-[#FFF6D8] text-[#946000]'
        return <li key={finding.id}><button type="button" id={`finding-row-${index}`} data-finding-id={finding.id} aria-label={`Investigate ${finding.id}: ${finding.investigationTitle}, ${employee.name}`} aria-pressed={selected} aria-controls="security-investigation" onClick={() => onSelect(finding.id)} onKeyDown={event => keyNavigate(event, index)} className={`flex min-h-[92px] w-full gap-3 rounded-lg border px-3 py-2.5 text-left ${selected ? 'border-green-400 bg-selected/60' : 'border-transparent border-b-line/60 hover:bg-canvas'}`}>
          <span aria-hidden="true" className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-lg font-semibold ${color}`}>!</span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="text-[13px] font-semibold leading-5">{finding.investigationTitle}</span><time dateTime={finding.detectedAt} title="UTC" className="shrink-0 text-[10px] leading-5 text-muted">{formatActivity(finding.detectedAt).replace(' · ', ', ')}</time></span><span className="mt-0.5 block truncate text-[11px] leading-[18px] text-muted">{finding.category} · {employee.name}</span><span className="mt-1 flex flex-wrap gap-2"><SeverityBadge severity={finding.severity} /><ReviewStatusBadge status={finding.reviewStatus} /></span></span>
        </button></li>
      })}</ul>}
    </div>
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted"><p role="status">{result.start}–{result.end} of {result.total} findings</p>{result.pageCount > 1 && <nav aria-label="Findings pagination" className="flex items-center gap-1"><button type="button" aria-label="Previous findings page" disabled={result.page === 1} onClick={() => onPage(result.page - 1)} className="flex size-7 items-center justify-center rounded text-accent disabled:opacity-40"><ChevronLeft size={14} aria-hidden="true" /></button>{getPaginationItems(result.page, result.pageCount).map((page, index) => page === 'ellipsis' ? <span key={`gap-${index}`}>…</span> : <button type="button" key={page} aria-label={`Findings page ${page}`} aria-current={result.page === page ? 'page' : undefined} onClick={() => onPage(page)} className={`min-h-7 min-w-7 rounded text-accent ${result.page === page ? 'font-semibold' : ''}`}>{page}</button>)}<button type="button" aria-label="Next findings page" disabled={result.page === result.pageCount} onClick={() => onPage(result.page + 1)} className="flex size-7 items-center justify-center rounded text-accent disabled:opacity-40"><ChevronRight size={14} aria-hidden="true" /></button></nav>}</div>
  </Card>
}
