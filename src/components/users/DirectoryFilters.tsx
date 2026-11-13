import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ListFilter, Search } from 'lucide-react'
import { departments } from '../../data/departments'
import { directoryRoles, type directoryFilters, type DirectoryContext } from '../../data/userDirectory'
import { Button } from '../ui/Button'

export function DirectoryFilters({ filters, context, onFilter }: { filters: ReturnType<typeof directoryFilters>; context: DirectoryContext; onFilter: (values: Record<string, string>) => void }) {
  const [open, setOpen] = useState(false)
  const [department, setDepartment] = useState(filters.department)
  const [status, setStatus] = useState(filters.status)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const first = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    if (open) first.current?.focus()
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  function close() { setOpen(false); trigger.current?.focus() }
  return <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_165px_164px]"><div className="relative min-w-0"><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-muted" /><input aria-label="Search directory users" type="search" placeholder="Search name, email, or employee ID..." value={filters.query} onChange={event => onFilter({ q: event.target.value })} className="min-h-11 w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-xs placeholder:text-muted" /></div><div className="relative"><select aria-label="Directory role filter" value={filters.role} onChange={event => onFilter({ userRole: event.target.value })} className="min-h-11 w-full appearance-none rounded-lg border border-line bg-surface pl-4 pr-8 text-xs"><option value="">Role</option>{directoryRoles.map(role => <option key={role}>{role}</option>)}</select><ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-4 top-4" /></div><div ref={root} className="relative" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); close() } }}><button type="button" ref={trigger} aria-controls="directory-more-filters" aria-expanded={open} onClick={() => { setDepartment(filters.department); setStatus(filters.status); setOpen(!open) }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs hover:bg-canvas"><ListFilter size={13} aria-hidden="true" />More Filters{(filters.department || filters.status) && <span aria-label="Active additional filters" className="size-1.5 rounded-full bg-accent" />}</button>{open && <form id="directory-more-filters" aria-label="More directory filters" onSubmit={event => { event.preventDefault(); onFilter({ department, status }); close() }} className="absolute right-0 top-full z-20 mt-2 w-[min(310px,calc(100vw-40px))] rounded-xl border border-line bg-surface p-5 shadow-sm"><label className="block text-sm font-medium">Department<select ref={first} aria-label="Directory department filter" value={department} onChange={event => setDepartment(event.target.value)} className="mt-2 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">All departments</option>{departments.filter(value => context.role !== 'Department Manager' || value.id === context.departmentId).map(value => <option key={value.id} value={value.id}>{value.homeDepartment}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Status<select aria-label="Directory status filter" value={status} onChange={event => setStatus(event.target.value)} className="mt-2 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">All statuses</option><option>Active</option><option>Inactive</option></select></label><div className="mt-5 flex justify-between gap-3"><Button variant="ghost" onClick={() => { onFilter({ department: '', status: '' }); close() }}>Reset</Button><Button type="submit">Apply filters</Button></div></form>}</div></div>
}
