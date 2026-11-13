import type { KeyboardEvent } from 'react'
import { Command, Info, Monitor, Search, Waypoints } from 'lucide-react'
import { observationAge, sourceHealth, type ReportingSource } from '../../data/coverageHealth'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { LoadingState } from '../ui/LoadingState'
import { SourceStatus } from './SourceStatus'

export function ReportingSources({ sources, selectedId, query, busy, error, onSearch, onSelect, onReset, onRetry, onLimitations }: { sources: ReportingSource[]; selectedId: string | null; query: string; busy: boolean; error: boolean; onSearch: (value: string) => void; onSelect: (value: string) => void; onReset: () => void; onRetry: () => void; onLimitations: () => void }) {
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowDown' ? Math.min(sources.length - 1, index + 1) : event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? sources.length - 1 : null
    if (next === null) return
    event.preventDefault(); onSelect(sources[next].id); document.getElementById(`source-${sources[next].id}`)?.focus()
  }
  return <Card className="flex min-w-0 flex-col [&]:p-4 2xl:min-h-[776px]">
    <div className="px-1"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold leading-7">Reporting Sources</h2><span className="text-xs text-muted">{sources.length} sources</span></div><p className="mt-1.5 text-xs leading-5 text-muted">Select a source to inspect health, coverage, and events.</p></div>
    <div className="relative mx-0.5 mt-5"><Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-muted" /><input aria-label="Search reporting sources" type="search" value={query} onChange={event => onSearch(event.target.value)} placeholder="Search sources or devices..." className="min-h-11 w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-xs placeholder:text-muted" /></div>
    <div className="mt-6" aria-busy={busy}>{busy ? <LoadingState message="Loading reporting sources…" /> : error ? <ErrorState title="Unable to load reporting sources" description="The local fixture could not be loaded. Try again to restore the demo snapshot." onRetry={onRetry} /> : sources.length === 0 ? <EmptyState title="No reporting sources found" description="No demo sources match the active search and filters." action={<Button variant="secondary" onClick={onReset}>Reset filters</Button>} /> : <ul aria-label="Reporting sources" className="space-y-3">{sources.map((source, index) => {
      const selected = source.id === selectedId
      const Icon = source.id === 'collectors' ? Monitor : source.id === 'litellm' ? Command : Waypoints
      const status = sourceHealth(source)
      return <li key={source.id}><button type="button" id={`source-${source.id}`} data-source-id={source.id} aria-label={`Inspect ${source.name}`} aria-pressed={selected} aria-controls="source-detail" onClick={() => onSelect(source.id)} onKeyDown={event => navigate(event, index)} className={`flex min-h-[124px] w-full gap-3 rounded-xl border p-3.5 text-left ${selected ? 'border-green-400 bg-selected/45' : 'border-line hover:bg-canvas'}`}><span aria-hidden="true" className={`mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-selected text-accent' : 'bg-[#F1F6F3] text-[#65716A]'}`}><Icon size={19} strokeWidth={1.6} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-start justify-between gap-2"><span className="text-base font-semibold leading-6">{source.name}</span><SourceStatus status={status} /></span><span className="mt-1 block text-[11px] leading-[18px] text-muted">{source.description}</span><span className="mt-2.5 block text-xs leading-[18px]">{status === 'Not Configured' ? 'No reporting configured in this preview' : status === 'Disconnected' ? 'Reporting Not Available' : source.subtitle}</span><span className="block text-[11px] leading-[18px] text-muted">Last report: {observationAge(source.lastObservation)}</span></span></button></li>
    })}</ul>}</div>
    <div className="mt-5 border-t border-line px-2 pt-6"><h3 className="text-[13px] font-semibold">Coverage rules</h3><p className="mt-2 text-xs leading-6 text-muted">A source is only covered when supported data is captured.<br />Missing reports should appear as Not Captured, not zero.</p></div>
    <div className="mt-auto pt-5"><div className="rounded-lg bg-[#F1F6F3] px-3 py-3"><p className="flex items-start gap-2 text-[11px] leading-5 text-muted"><Info size={12} className="mt-1 shrink-0" aria-hidden="true" />Some activities are not supported by monitoring.</p><button type="button" onClick={onLimitations} className="ml-5 rounded text-[11px] font-semibold leading-5 text-accent hover:underline">See Monitoring Limitations for details ↗</button></div></div>
  </Card>
}
