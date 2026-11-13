import { useRef, useState } from 'react'
import { Check, Play, UserPlus, X } from 'lucide-react'
import { employees } from '../../data/entityAnalytics'
import { securityStatuses, type ReviewAction, type ReviewStatus, type SecurityFinding, type SecurityRole } from '../../data/securityFindings'
import { trapDialogFocus } from '../../utils/trapDialogFocus'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'

export function ReviewResolution({ finding, role, feedback, onAction }: { finding: SecurityFinding | null; role: SecurityRole; feedback: string; onAction: (action: ReviewAction) => void }) {
  const [draftStatus, setDraftStatus] = useState<ReviewStatus | null>(null)
  const [note, setNote] = useState('')
  const [assignment, setAssignment] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  if (!finding) return <Card className="px-6 py-5 2xl:min-h-[240px]"><EmptyState title="Select a finding to review" description="Review actions are available to the Administrator demo role." /></Card>
  const readonly = role === 'Viewer'
  const status = readonly ? finding.reviewStatus : draftStatus ?? finding.reviewStatus
  const changed = status !== finding.reviewStatus
  const buttonLabel = changed ? 'Save Review' : status === 'Open' ? 'Start Review' : status === 'In Review' ? 'Mark as Reviewed' : 'Reopen'
  const nextStatus: ReviewStatus = changed ? status : status === 'Open' ? 'In Review' : status === 'In Review' ? 'Resolved' : 'Open'

  function review() {
    if (readonly) return
    onAction({ type: 'review', status: nextStatus, note })
    setDraftStatus(null); setNote('')
  }
  return <Card className="px-6 py-5 2xl:min-h-[240px]">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-lg font-semibold"><Check size={20} aria-hidden="true" className="shrink-0 text-accent" />Review &amp; Resolution</h2><button ref={trigger} type="button" aria-label="Assign finding" disabled={readonly} title={readonly ? 'Viewer demo is read-only' : 'Assign this finding to a demo employee'} onClick={() => { setAssignment(finding.assigneeId ?? ''); dialog.current?.showModal() }} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-accent hover:bg-selected disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60"><UserPlus size={15} aria-hidden="true" />Assign</button></div>
    {readonly && <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-xs text-muted">Viewer demo is read-only. Status, notes, and assignment controls are disabled.</p>}
    <div className="mt-6 grid gap-5 md:grid-cols-[1fr_2.05fr_1fr]">
      <label className="block text-xs font-medium">Status<select aria-label="Finding review status" disabled={readonly} value={status} onChange={event => { if (!readonly) setDraftStatus(event.target.value as ReviewStatus) }} className="mt-2 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-xs disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted">{securityStatuses.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-xs font-medium">Review Notes (optional)<textarea aria-label="Review notes" disabled={readonly} value={note} maxLength={2000} onChange={event => { if (!readonly) setNote(event.target.value) }} placeholder="Add your review notes..." className="mt-2 min-h-[72px] w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-xs leading-5 placeholder:text-muted disabled:cursor-not-allowed disabled:bg-canvas" /></label>
      <div className="md:pt-[35px]"><Button onClick={review} disabled={readonly} title={readonly ? 'Viewer demo cannot change findings' : 'Updates this prototype only'} className="min-h-12 w-full gap-1.5 px-3 text-xs"><Play size={13} aria-hidden="true" />{buttonLabel}</Button></div>
    </div>
    {finding.assigneeId && <p className="mt-2 text-xs text-muted">Assigned to {employees.find(employee => employee.id === finding.assigneeId)!.name}</p>}
    {feedback && <p role="status" className="mt-3 text-xs leading-5 text-accent">{feedback}</p>}
    <p className="mt-6 text-[11px] leading-5 text-muted">Prototype data · local review actions only · no security system updates.</p>
    <dialog ref={dialog} aria-labelledby="assign-finding-title" onKeyDown={trapDialogFocus} onClose={() => trigger.current?.focus()} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_32px)] max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-ink/30"><div className="flex items-center justify-between gap-4"><h2 id="assign-finding-title" className="text-lg font-semibold">Assign {finding.id}</h2><button type="button" aria-label="Close assignment" onClick={() => dialog.current?.close()} className="rounded p-1 hover:bg-neutral"><X size={19} aria-hidden="true" /></button></div><p className="mt-2 text-sm text-muted">Assignment updates this local prototype only.</p><label className="mt-5 block text-sm font-medium">Assignee<select aria-label="Finding assignee" autoFocus disabled={readonly} value={assignment} onChange={event => { if (!readonly) setAssignment(event.target.value) }} className="mt-2 min-h-11 w-full rounded-lg border border-line bg-surface px-3"><option value="">Unassigned</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => dialog.current?.close()}>Cancel</Button><Button disabled={readonly} onClick={() => { if (!readonly) { onAction({ type: 'assign', assigneeId: assignment || null }); dialog.current?.close() } }}>Save assignment</Button></div></dialog>
  </Card>
}
