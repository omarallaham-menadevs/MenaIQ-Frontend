import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Filter, Search, X } from 'lucide-react'
import { employees } from '../../data/entityAnalytics'
import { traceCommits, traceRepositories, type TraceFilters } from '../../data/traceability'
import { Button } from '../ui/Button'

export type TraceExtraFilters = Pick<TraceFilters, 'author' | 'branch' | 'linkStatus' | 'prState'>
function extras(filters: TraceFilters): TraceExtraFilters { return { author: filters.author, branch: filters.branch, linkStatus: filters.linkStatus, prState: filters.prState } }
const branches = [...new Set(traceCommits.map(commit => commit.branch))].sort()

export function TraceToolbar({ filters, placeholder, onChange, onApply }: { filters: TraceFilters; placeholder: string; onChange: (key: 'q' | 'repository', value: string) => void; onApply: (filters: TraceExtraFilters) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => extras(filters))
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const first = useRef<HTMLSelectElement>(null)
  const count = Object.values(extras(filters)).filter(Boolean).length
  useEffect(() => {
    if (open) first.current?.focus()
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function close() { setOpen(false); trigger.current?.focus() }

  return <div className="flex flex-wrap items-center gap-3">
    <div className="relative w-full sm:w-[316px]"><Search size={19} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-muted" /><input type="search" aria-label="Search traceability records" placeholder={placeholder} value={filters.query} onChange={event => onChange('q', event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface py-2 pl-11 pr-3 text-sm placeholder:text-muted" /></div>
    <div className="relative w-[216px]"><select aria-label="Filter by repository" value={filters.repository} onChange={event => onChange('repository', event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-4 pr-9 text-sm font-semibold"><option value="">Repository</option>{traceRepositories.map(repository => <option key={repository.id}>{repository.name}</option>)}</select><ChevronDown size={18} className="pointer-events-none absolute right-4 top-3" aria-hidden="true" /></div>
    <div ref={ref} className="relative" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); close() } }}>
      <button type="button" ref={trigger} aria-expanded={open} aria-controls="trace-more-filters" onClick={() => { setDraft(extras(filters)); setOpen(!open) }} className="inline-flex min-h-11 items-center justify-center gap-3 rounded-xl border border-line bg-surface px-5 text-sm font-semibold hover:bg-canvas"><Filter size={19} aria-hidden="true" />More Filters{count > 0 && <span className="rounded bg-selected px-1.5 text-accent">{count}</span>}</button>
      {open && <form id="trace-more-filters" aria-label="More traceability filters" className="absolute left-0 top-full z-20 mt-2 w-[min(340px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-5 shadow-sm sm:left-auto sm:right-0" onSubmit={event => { event.preventDefault(); onApply(draft); close() }}>
        <div className="mb-4 flex justify-between gap-3"><h2 className="font-semibold">More Filters</h2><button type="button" aria-label="Close more filters" onClick={close} className="rounded p-1 hover:bg-neutral"><X size={18} aria-hidden="true" /></button></div>
        <div className="space-y-4">
          <label className="block text-sm font-medium">Author / reviewer<select ref={first} value={draft.author} onChange={event => setDraft(current => ({ ...current, author: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All people</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
          <label className="block text-sm font-medium">Branch<select value={draft.branch} onChange={event => setDraft(current => ({ ...current, branch: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All branches</option>{branches.map(branch => <option key={branch}>{branch}</option>)}</select></label>
          <label className="block text-sm font-medium">Link status<select value={draft.linkStatus} onChange={event => setDraft(current => ({ ...current, linkStatus: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All link statuses</option>{['Verified', 'Unverified', 'Unlinked'].map(status => <option key={status}>{status}</option>)}</select></label>
          <label className="block text-sm font-medium">Pull request state<select value={draft.prState} onChange={event => setDraft(current => ({ ...current, prState: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All PR states</option>{['Merged', 'Open', 'Closed', 'No PR'].map(state => <option key={state}>{state}</option>)}</select></label>
        </div>
        <div className="mt-5 flex justify-between gap-3"><Button variant="ghost" onClick={() => { onApply({ author: '', branch: '', linkStatus: '', prState: '' }); close() }}>Reset</Button><Button type="submit">Apply filters</Button></div>
      </form>}
    </div>
  </div>
}
