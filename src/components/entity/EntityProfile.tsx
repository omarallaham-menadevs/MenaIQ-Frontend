import { useEffect, useRef } from 'react'
import { EllipsisVertical, Laptop, Mail, Monitor, UsersRound, X } from 'lucide-react'
import { employees, entityTabs, type EntityAnalytics, type EntityTab } from '../../data/entityAnalytics'
import { trapDialogFocus } from '../../utils/trapDialogFocus'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function EntityProfile({ data, onTabChange }: { data: EntityAnalytics; onTabChange: (tab: EntityTab) => void }) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { employee, device } = data
  const owner = employees.find(item => item.id === device?.ownerId)
  const initials = data.name.split(' ').map(part => part[0]).slice(0, 2).join('')
  const status = employee?.status ?? device!.status

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) detailsRef.current.open = false
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])

  function goToTab(tab: EntityTab) {
    if (detailsRef.current) detailsRef.current.open = false
    onTabChange(tab)
    document.getElementById(`entity-tab-${entityTabs.indexOf(tab)}`)?.focus()
  }

  return (
    <>
      <Card className="relative px-6 py-3">
        <div className="grid min-h-[66px] items-center gap-y-5 pr-9 sm:grid-cols-2 2xl:grid-cols-[316px_220px_330px_minmax(0,1fr)] 2xl:pr-8">
          <div className="flex min-w-0 items-center gap-5">
            <div aria-hidden="true" className="flex size-[66px] shrink-0 items-center justify-center rounded-full bg-[#E5DEFF] text-[23px] font-bold text-[#17116A]">{employee ? initials : <Laptop size={28} />}</div>
            <div className="min-w-0"><h2 className="break-words text-xl font-bold tracking-tight">{data.name}</h2><p className="mt-1 text-base text-muted">{employee?.role ?? device!.platform}</p></div>
          </div>
          <div className="flex min-w-0 items-center gap-3 2xl:h-9 2xl:border-l 2xl:border-line 2xl:pl-[52px]">
            <UsersRound size={21} className="shrink-0 text-muted" aria-hidden="true" /><span className="text-base font-medium">{employee?.department ?? owner?.name ?? 'Owner Not Available'}</span>
          </div>
          <div className="flex min-w-0 items-center gap-3 2xl:h-9 2xl:border-l 2xl:border-line 2xl:pl-[52px]">
            {employee ? <Mail size={22} className="shrink-0 text-muted" aria-hidden="true" /> : <Monitor size={22} className="shrink-0 text-muted" aria-hidden="true" />}
            <span className="break-all text-base font-medium">{employee?.email ?? device!.id}</span>
          </div>
          <div className="2xl:border-l 2xl:border-line 2xl:pl-[52px]">
            <Badge tone={status === 'Active' ? 'success' : 'neutral'} className="gap-2 whitespace-nowrap px-4 py-1.5 text-base font-semibold"><span aria-hidden="true" className={`size-2.5 rounded-full ${status === 'Active' ? 'bg-success' : 'bg-muted'}`} />{status}</Badge>
          </div>
        </div>
        <details ref={detailsRef} className="absolute right-6 top-7 z-10" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() } }}>
          <summary aria-label="Entity actions" className="flex size-8 list-none items-center justify-center rounded hover:bg-neutral [&::-webkit-details-marker]:hidden"><EllipsisVertical size={22} aria-hidden="true" /></summary>
          <div role="group" aria-label="Entity actions" className="absolute right-0 mt-2 w-48 rounded-lg border border-line bg-surface p-1.5 text-sm shadow-sm">
            <button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-canvas" onClick={() => { if (detailsRef.current) detailsRef.current.open = false; dialogRef.current?.showModal() }}>View entity details</button>
            <button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-canvas" onClick={() => goToTab('Sessions')}>View sessions</button>
            <button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-canvas" onClick={() => goToTab('Security')}>View security</button>
          </div>
        </details>
      </Card>
      <dialog ref={dialogRef} aria-labelledby="entity-details-title" onKeyDown={trapDialogFocus} onClose={() => detailsRef.current?.querySelector('summary')?.focus()} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_32px)] max-w-lg overflow-y-auto rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-ink/30">
        <div className="flex items-start justify-between gap-3">
          <h2 id="entity-details-title" className="text-xl font-bold">{data.name}</h2>
          <Button autoFocus variant="ghost" aria-label="Close entity details" className="px-2" onClick={() => dialogRef.current?.close()}><X size={20} aria-hidden="true" /></Button>
        </div>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-4 text-sm">
          <dt className="text-muted">Entity type</dt><dd>{employee ? 'Employee' : 'Device'}</dd>
          <dt className="text-muted">Identifier</dt><dd>{data.entityId}</dd>
          <dt className="text-muted">{employee ? 'Email' : 'Owner'}</dt><dd className="break-all">{employee?.email ?? owner?.name ?? 'Not Available'}</dd>
          <dt className="text-muted">{employee ? 'Department' : 'Platform'}</dt><dd>{employee?.department ?? device!.platform}</dd>
          <dt className="text-muted">Status</dt><dd>{status}</dd>
        </dl>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">Prototype entity data. No live directory or device connection.</p>
      </dialog>
    </>
  )
}
