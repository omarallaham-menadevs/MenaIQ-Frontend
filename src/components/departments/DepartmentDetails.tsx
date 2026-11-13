import { useEffect, useRef } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Period } from '../../data/companyOverview'
import type { DepartmentRow } from '../../data/departments'
import { formatCost, formatTokens } from '../../data/entityAnalytics'
import { trapDialogFocus } from '../../utils/trapDialogFocus'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

export function DepartmentDetails({ selectedId, row, period, onClose }: { selectedId: string | null; row: DepartmentRow | undefined; period: Period; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const leavingRef = useRef(false)
  useEffect(() => {
    if (selectedId) {
      leavingRef.current = false
      ref.current?.showModal()
    }
    else ref.current?.close()
  }, [selectedId])

  return (
    <dialog ref={ref} onClose={() => { if (!leavingRef.current) onClose() }} onKeyDown={trapDialogFocus} aria-labelledby="department-details-title" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_32px)] max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-ink/30" onClick={event => {
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) ref.current?.close()
    }}>
      <div className="flex items-start justify-between gap-4"><div><h2 id="department-details-title" className="text-xl font-bold">{row?.name ?? 'Department Not Available'}</h2><p className="mt-1 text-sm text-muted">{row ? `Department details · Last ${period} days` : 'This department is not part of the current reporting scope.'}</p></div><Button variant="ghost" autoFocus className="px-2" aria-label="Close department details" onClick={() => ref.current?.close()}><X size={20} aria-hidden="true" /></Button></div>
      {row && <>
        <dl className="my-6 grid grid-cols-2 gap-4 rounded-lg bg-canvas p-4 text-sm"><div><dt className="text-muted">Employees</dt><dd className="mt-1 font-semibold">{row.employees}</dd></div><div><dt className="text-muted">Sessions</dt><dd className="mt-1 font-semibold">{row.sessions?.toLocaleString('en-US') ?? 'Not Available'}</dd></div><div><dt className="text-muted">Measured Tokens</dt><dd className="mt-1 font-semibold">{formatTokens(row.measuredTokens)}</dd></div><div><dt className="text-muted">Estimated Cost</dt><dd className="mt-1 font-semibold">{formatCost(row.costCents)}</dd></div></dl>
        <h3 className="text-base font-semibold">Employees</h3>
        {row.members.length ? <ul className="mt-3 divide-y divide-line">{row.members.map(employee => <li key={employee.id}><Link to={`/entity-analytics?entity=${employee.id}&period=${period}`} onClick={event => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey) leavingRef.current = true }} className="flex items-center justify-between gap-3 rounded py-3 hover:bg-canvas"><span><span className="block text-sm font-medium">{employee.name}</span><span className="mt-1 block text-xs text-muted">{employee.role}</span></span><ArrowRight size={18} className="text-accent" aria-hidden="true" /></Link></li>)}</ul> : <EmptyState title="No employees assigned" description="This department has no employees or recorded activity in the prototype roster." />}
        <p className="mt-5 text-xs leading-5 text-muted">Prototype data. Employee links open Entity Analytics for the same reporting period.</p>
      </>}
    </dialog>
  )
}
