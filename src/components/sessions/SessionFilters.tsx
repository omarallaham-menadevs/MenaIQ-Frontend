import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, Filter, Search, X } from 'lucide-react'
import { devices, employees } from '../../data/entityAnalytics'
import { periods } from '../../data/companyOverview'
import { sessionAgents, sessionRepositories, sessionStatuses, type SessionFilters as Filters } from '../../data/sessions'
import { Button } from '../ui/Button'

type ExtraFilters = Pick<Filters, 'employee' | 'repository' | 'device' | 'minDuration'>

function extraValues(filters: Filters): ExtraFilters {
  return { employee: filters.employee, repository: filters.repository, device: filters.device, minDuration: filters.minDuration }
}

export function SessionFilters({ filters, onChange, onApplyMore }: { filters: Filters; onChange: (key: 'q' | 'agent' | 'status' | 'period', value: string) => void; onApplyMore: (filters: ExtraFilters) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ExtraFilters>(() => extraValues(filters))
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const firstControl = useRef<HTMLSelectElement>(null)
  const count = [filters.employee, filters.repository, filters.device, filters.minDuration].filter(Boolean).length

  useEffect(() => {
    if (open) firstControl.current?.focus()
    function outside(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  function close() { setOpen(false); trigger.current?.focus() }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-[316px]"><Search size={19} className="pointer-events-none absolute left-3.5 top-3 text-muted" aria-hidden="true" /><input type="search" aria-label="Search sessions" placeholder="Search sessions..." value={filters.query} onChange={event => onChange('q', event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface py-2 pl-11 pr-3 text-sm placeholder:text-muted" /></div>
      <FilterSelect label="Agent" value={filters.agent} options={sessionAgents} onChange={value => onChange('agent', value)} />
      <FilterSelect label="Status" value={filters.status} options={sessionStatuses} onChange={value => onChange('status', value)} />
      <div ref={ref} className="relative" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); close() } }}>
        <button type="button" ref={trigger} aria-expanded={open} aria-controls="more-session-filters" onClick={() => { setDraft(extraValues(filters)); setOpen(!open) }} className="inline-flex min-h-11 items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-canvas"><Filter size={18} aria-hidden="true" />More Filters{count > 0 && <span className="rounded bg-selected px-1.5 text-accent">{count}</span>}</button>
        {open && <form id="more-session-filters" aria-label="Additional session filters" className="absolute left-0 top-full z-20 mt-2 w-[min(340px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-5 shadow-sm sm:left-auto sm:right-0" onSubmit={event => { event.preventDefault(); onApplyMore(draft); close() }}>
          <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-base font-semibold">More Filters</h2><button type="button" aria-label="Close more filters" onClick={close} className="rounded p-1 hover:bg-neutral"><X size={18} aria-hidden="true" /></button></div>
          <div className="space-y-4">
            <label className="block text-sm font-medium">Employee<select ref={firstControl} value={draft.employee} onChange={event => setDraft(current => ({ ...current, employee: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All employees</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Repository<select value={draft.repository} onChange={event => setDraft(current => ({ ...current, repository: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All repositories</option>{sessionRepositories.map(repository => <option key={repository}>{repository}</option>)}</select></label>
            <label className="block text-sm font-medium">Device<select value={draft.device} onChange={event => setDraft(current => ({ ...current, device: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All devices</option>{devices.map(device => <option key={device.id} value={device.id}>{device.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Minimum duration<select value={draft.minDuration} onChange={event => setDraft(current => ({ ...current, minDuration: Number(event.target.value) }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value={0}>Any duration</option><option value={300}>5 minutes</option><option value={600}>10 minutes</option><option value={900}>15 minutes</option></select></label>
          </div>
          <div className="mt-5 flex justify-between gap-3"><Button type="button" variant="ghost" onClick={() => { onApplyMore({ employee: '', repository: '', device: '', minDuration: 0 }); close() }}>Reset</Button><Button type="submit">Apply filters</Button></div>
        </form>}
      </div>
      <div className="relative w-[226px] sm:ml-auto"><CalendarDays size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3" /><select aria-label="Sessions reporting period" value={filters.period} onChange={event => onChange('period', event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-10 pr-9 text-sm font-medium">{periods.map(period => <option key={period} value={period}>Last {period} days</option>)}</select><ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5" /></div>
    </div>
  )
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return <div className="relative w-[164px]"><select aria-label={`Filter by ${label.toLowerCase()}`} value={value} onChange={event => onChange(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-line bg-surface px-4 pr-9 text-sm font-medium"><option value="">{label}</option>{options.map(option => <option key={option}>{option}</option>)}</select><ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-4 top-3.5" /></div>
}
