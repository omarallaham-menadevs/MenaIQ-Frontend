import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Filter, X } from 'lucide-react'
import { employees } from '../../data/entityAnalytics'
import { departments } from '../../data/departments'
import { sessionAgents, sessionRepositories } from '../../data/sessions'
import { usageModels, type UsageFilters as Filters } from '../../data/usageAndCost'
import { Button } from '../ui/Button'

export type UsageExtraFilters = Pick<Filters, 'agent' | 'repository' | 'costAvailability' | 'status'>
function extras(filters: Filters): UsageExtraFilters { return { agent: filters.agent, repository: filters.repository, costAvailability: filters.costAvailability, status: filters.status } }

export function UsageFilters({ filters, onChange, onApply }: { filters: Filters; onChange: (key: 'employee' | 'department' | 'model', value: string) => void; onApply: (filters: UsageExtraFilters) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => extras(filters))
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const first = useRef<HTMLSelectElement>(null)
  const count = Object.values(extras(filters)).filter(Boolean).length
  useEffect(() => {
    if (open) first.current?.focus()
    function dismiss(event: PointerEvent) { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  function close() { setOpen(false); trigger.current?.focus() }

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_0.9fr_1.02fr_1.4fr] xl:gap-6">
    <Selector label="Employee" value={filters.employee} onChange={value => onChange('employee', value)} options={employees.map(employee => ({ id: employee.id, name: employee.name }))} />
    <Selector label="Department" value={filters.department} onChange={value => onChange('department', value)} options={departments.map(department => ({ id: department.id, name: department.name }))} />
    <Selector label="Model" value={filters.model} onChange={value => onChange('model', value)} options={usageModels.map(model => ({ id: model, name: model }))} />
    <div ref={ref} className="relative" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); close() } }}>
      <button ref={trigger} type="button" aria-expanded={open} aria-controls="usage-more-filters" onClick={() => { setDraft(extras(filters)); setOpen(!open) }} className="inline-flex min-h-[42px] w-full items-center gap-4 rounded-xl border border-line bg-surface px-8 text-sm font-medium hover:bg-canvas"><Filter size={19} aria-hidden="true" />More Filters{count > 0 && <span className="rounded bg-selected px-1.5 text-accent">{count}</span>}</button>
      {open && <form id="usage-more-filters" aria-label="More usage filters" className="absolute left-0 top-full z-20 mt-2 w-[min(340px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-5 shadow-sm xl:left-auto xl:right-0" onSubmit={event => { event.preventDefault(); onApply(draft); close() }}>
        <div className="mb-4 flex justify-between gap-3"><h2 className="text-base font-semibold">More Filters</h2><button type="button" onClick={close} aria-label="Close more usage filters" className="rounded p-1 hover:bg-neutral"><X size={18} aria-hidden="true" /></button></div>
        <div className="space-y-4">
          <label className="block text-sm font-medium">Agent<select ref={first} value={draft.agent} onChange={event => setDraft(current => ({ ...current, agent: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All agents</option>{sessionAgents.map(agent => <option key={agent}>{agent}</option>)}</select></label>
          <label className="block text-sm font-medium">Repository<select value={draft.repository} onChange={event => setDraft(current => ({ ...current, repository: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All repositories</option>{sessionRepositories.map(repository => <option key={repository}>{repository}</option>)}</select></label>
          <label className="block text-sm font-medium">Cost availability<select value={draft.costAvailability} onChange={event => setDraft(current => ({ ...current, costAvailability: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All cost bases</option><option value="available">Company-key estimate available</option><option value="unavailable">Cost Not Available</option></select></label>
          <label className="block text-sm font-medium">Request status<select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All statuses</option><option>Success</option><option>Failed</option></select></label>
        </div>
        <div className="mt-5 flex justify-between gap-3"><Button variant="ghost" onClick={() => { onApply({ agent: '', repository: '', costAvailability: '', status: '' }); close() }}>Reset</Button><Button type="submit">Apply filters</Button></div>
      </form>}
    </div>
  </div>
}
function Selector({ label, value, options, onChange }: { label: string; value: string; options: { id: string; name: string }[]; onChange: (value: string) => void }) {
  return <div className="relative min-w-0"><select aria-label={`Usage ${label.toLowerCase()} filter`} value={value} onChange={event => onChange(event.target.value)} className="min-h-[42px] w-full appearance-none truncate rounded-xl border border-line bg-surface py-2 pl-5 pr-10 text-sm font-medium"><option value="">{label}</option>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select><ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-4 top-3" /></div>
}
