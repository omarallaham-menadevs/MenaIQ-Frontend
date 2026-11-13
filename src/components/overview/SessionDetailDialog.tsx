import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatActivity, parsePeriod, type Session } from '../../data/companyOverview'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { SessionStatus } from './SessionStatus'
import { trapDialogFocus } from '../../utils/trapDialogFocus'

export function SessionDetailDialog({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [params] = useSearchParams()

  useEffect(() => {
    if (session) ref.current?.showModal()
    else ref.current?.close()
  }, [session])

  return (
    <dialog ref={ref} aria-labelledby="session-detail-title" onClose={onClose} onKeyDown={trapDialogFocus} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_32px)] max-w-lg overflow-y-auto rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-ink/30" onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) ref.current?.close()
    }}>
      {session && <>
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="session-detail-title" className="text-xl font-bold">{session.id}</h2><p className="mt-1 text-sm text-muted">AI coding session details</p></div>
          <Button variant="ghost" autoFocus className="px-2" aria-label="Close session details" onClick={() => ref.current?.close()}><Icon name="close" /></Button>
        </div>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-sm">
          <dt className="text-muted">Employee</dt><dd>{session.employee}</dd>
          <dt className="text-muted">Agent</dt><dd>{session.agent}</dd>
          <dt className="text-muted">Repository</dt><dd className="break-all">{session.repository}</dd>
          <dt className="text-muted">Status</dt><dd><SessionStatus status={session.status} /></dd>
          <dt className="text-muted">Last activity</dt><dd>{formatActivity(session.lastActivity)} UTC</dd>
        </dl>
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">Prototype session data. No live collection is connected.</p>
        <Link to={`/sessions?session=${encodeURIComponent(session.id)}&period=${parsePeriod(params.get('period'))}`} className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-selected px-4 py-2 text-sm font-medium text-accent hover:bg-success-soft">Open in Sessions →</Link>
      </>}
    </dialog>
  )
}
