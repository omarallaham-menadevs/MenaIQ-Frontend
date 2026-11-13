import { useEffect, useRef, useState } from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { departments } from '../../data/departments'
import { employees } from '../../data/entityAnalytics'
import { sessionAgents, sessionRepositories } from '../../data/sessions'
import type { SecurityFilters } from '../../data/securityFindings'
import { Button } from '../ui/Button'

export type SecurityExtraFilters = Pick<SecurityFilters, 'repository' | 'employee' | 'department' | 'assignee' | 'evidence'>
function extras(filters: SecurityFilters): SecurityExtraFilters { return { repository: filters.repository, employee: filters.employee, department: filters.department, assignee: filters.assignee, evidence: filters.evidence } }

export function SecurityQueueFilters({ filters, onFilter, onApply }: { filters: SecurityFilters; onFilter: (key: 'severity' | 'agent', value: string) => void; onApply: (values: SecurityExtraFilters) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => extras(filters))
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const first = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    if (open) first.current?.focus()
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function close() { setOpen(false); trigger.current?.focus() }

  return <div className="grid grid-cols-[1.1fr_1fr_1.25fr] gap-3">
    <div className="relative min-w-0"><select aria-label="Finding severity filter" value={filters.severity} onChange={event => onFilter('severity', event.target.value)} className="min-h-10 w-full appearance-none rounded-lg border border-line bg-surface py-2 pl-3 pr-6 text-xs"><option value="">Severity</option>{['Critical', 'High', 'Medium'].map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5" /></div>
    <div className="relative min-w-0"><select aria-label="Finding agent filter" value={filters.agent} onChange={event => onFilter('agent', event.target.value)} className="min-h-10 w-full appearance-none truncate rounded-lg border border-line bg-surface py-2 pl-3 pr-6 text-xs"><option value="">Agent</option>{sessionAgents.map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5" /></div>
    <div ref={ref} className="relative" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); close() } }}>
      <button type="button" ref={trigger} aria-expanded={open} aria-controls="security-more-filters" onClick={() => { setDraft(extras(filters)); setOpen(!open) }} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-2 text-xs hover:bg-canvas"><SlidersHorizontal size={12} aria-hidden="true" />More Filters</button>
      {open && <form id="security-more-filters" aria-label="More security filters" className="absolute right-0 top-full z-30 mt-2 max-h-[70dvh] w-[min(340px,calc(100vw-32px))] overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-sm" onSubmit={event => { event.preventDefault(); onApply(draft); close() }}><div className="mb-4 flex justify-between gap-3"><h3 className="text-base font-semibold">More Filters</h3><button type="button" onClick={close} aria-label="Close more security filters" className="rounded p-1 hover:bg-neutral"><X size={18} aria-hidden="true" /></button></div><div className="space-y-4">
        <label className="block text-sm font-medium">Repository<select ref={first} value={draft.repository} onChange={event => setDraft(current => ({ ...current, repository: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All repositories</option>{sessionRepositories.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="block text-sm font-medium">Employee<select value={draft.employee} onChange={event => setDraft(current => ({ ...current, employee: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All employees</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Department<select value={draft.department} onChange={event => setDraft(current => ({ ...current, department: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All departments</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Assignee<select value={draft.assignee} onChange={event => setDraft(current => ({ ...current, assignee: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">Any assignment</option><option value="unassigned">Unassigned</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Evidence<select value={draft.evidence} onChange={event => setDraft(current => ({ ...current, evidence: event.target.value }))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3"><option value="">All evidence states</option><option value="Demo sample">Recorded demo sample</option><option>Missing</option></select></label>
      </div><div className="mt-5 flex justify-between gap-3"><Button variant="ghost" onClick={() => { onApply({ repository: '', employee: '', department: '', assignee: '', evidence: '' }); close() }}>Reset</Button><Button type="submit">Apply filters</Button></div></form>}
    </div>
  </div>
}
