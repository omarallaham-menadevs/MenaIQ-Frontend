import type { KeyboardEvent, ReactNode } from 'react'
import { Bot, CalendarDays, CircleAlert, CircleCheck, Clock3, CodeXml, Play, Square, UserRound, Wrench, X } from 'lucide-react'
import { detailTabs, formatSessionTime, getSessionInvestigation, type DetailTab } from '../../data/sessions'
import { formatActivity } from '../../data/companyOverview'
import { formatDuration, type EntitySession } from '../../data/entityAnalytics'
import { SessionStatus } from '../overview/SessionStatus'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'

export function SessionDetailsPanel({ session, missing, filteredOut, tab, onTabChange, onClose, onClearFilters }: { session: EntitySession | null; missing: boolean; filteredOut: boolean; tab: DetailTab; onTabChange: (tab: DetailTab) => void; onClose: () => void; onClearFilters: () => void }) {
  if (!session) return <Card id="session-detail-panel" className="min-w-0 px-[18px] py-5 2xl:min-h-[750px]"><EmptyState title={missing ? 'Session not found' : filteredOut ? 'Session outside current filters' : 'No session selected'} description={missing ? 'This session ID is not present in the prototype dataset.' : filteredOut ? 'Clear the active filters to view this session.' : 'Select a session from the table to inspect its activity.'} action={filteredOut ? <Button variant="secondary" onClick={onClearFilters}>Clear filters</Button> : missing ? <Button variant="secondary" onClick={onClose}>Clear selection</Button> : undefined} /></Card>
  const investigation = getSessionInvestigation(session)

  function navigateTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % detailTabs.length : event.key === 'ArrowLeft' ? (index + detailTabs.length - 1) % detailTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? detailTabs.length - 1 : null
    if (next === null) return
    event.preventDefault()
    onTabChange(detailTabs[next])
    document.getElementById(`session-tab-${next}`)?.focus()
  }

  return (
    <Card id="session-detail-panel" aria-label={`Details for ${session.id}`} className="min-w-0 px-[18px] py-5 2xl:min-h-[750px]">
      <div className="flex items-center gap-5"><h2 className="min-w-0 break-words text-[26px] font-bold leading-8 tracking-tight">{session.id}</h2><SessionStatus status={session.status} /><button type="button" aria-label="Deselect session" onClick={onClose} className="ml-auto shrink-0 rounded p-1 hover:bg-neutral"><X size={18} aria-hidden="true" /></button></div>
      <dl className="mt-7 grid grid-cols-1 gap-y-7 sm:grid-cols-3">
        <Metadata label="Employee" icon={<UserRound size={20} />}>{session.employee}</Metadata>
        <Metadata label="Agent" icon={<Bot size={21} />} separator>{session.agent}</Metadata>
        <Metadata label="Repository" icon={<CodeXml size={21} />} separator>{session.repository}</Metadata>
        <Metadata label="Start Time" icon={<CalendarDays size={20} />}><time dateTime={session.startedAt} title="UTC">{formatActivity(session.startedAt)}</time></Metadata>
        <Metadata label="Duration" icon={<Clock3 size={21} />} separator>{formatDuration(session.durationSeconds)}</Metadata>
      </dl>
      <div role="tablist" aria-label="Session investigation" className="mt-[34px] grid min-h-[46px] grid-cols-4 rounded-[14px] border border-line p-1">
        {detailTabs.map((item, index) => <button type="button" role="tab" key={item} id={`session-tab-${index}`} aria-selected={item === tab} aria-controls="session-investigation-panel" tabIndex={item === tab ? 0 : -1} onKeyDown={event => navigateTab(event, index)} onClick={() => onTabChange(item)} className={`rounded-xl px-1 py-1.5 text-sm font-semibold ${item === tab ? 'bg-success-soft text-success' : 'hover:bg-canvas'}`}>{item}</button>)}
      </div>
      <div id="session-investigation-panel" role="tabpanel" aria-labelledby={`session-tab-${detailTabs.indexOf(tab)}`} tabIndex={0} className="mt-5 rounded-xl border border-line/60">
        {tab === 'Timeline' && <ol className="divide-y divide-line/40">{investigation.timeline.map((event, index) => {
          const EventIcon = event.kind === 'start' ? Play : event.kind === 'tool' ? Wrench : event.kind === 'response' ? CodeXml : session.status === 'Completed' ? CircleCheck : session.status === 'Failed' ? CircleAlert : Square
          const color = event.kind === 'start' ? 'bg-selected text-success' : event.kind === 'response' ? 'bg-violet-100 text-indigo-700' : event.kind === 'end' ? session.status === 'Completed' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger' : 'bg-neutral text-muted'
          return <li key={event.id} className="relative flex min-h-[73px] gap-5 px-3.5 py-3">
            {index < investigation.timeline.length - 1 && <span aria-hidden="true" className="absolute bottom-[-14px] left-[34px] top-12 w-px bg-line/60" />}
            <span aria-hidden="true" className={`relative z-10 flex size-[42px] shrink-0 items-center justify-center rounded-full ${color}`}><EventIcon size={21} strokeWidth={1.8} /></span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1"><h3 className="text-sm font-semibold">{event.title}{event.tool && <code className="ml-2 rounded bg-neutral px-1.5 py-0.5 text-xs font-normal">{event.tool}</code>}</h3><time dateTime={event.timestamp} className="text-xs leading-5 text-muted">{formatSessionTime(event.timestamp)}</time></div><p className="mt-0.5 break-words text-sm leading-5 text-muted">{event.summary}</p></div>
          </li>
        })}</ol>}
        {tab === 'Tool Calls' && <ul className="divide-y divide-line/50">{investigation.toolCalls.map(call => <li key={call.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-mono text-sm font-semibold">{call.name}</h3><Badge tone={call.outcome === 'Succeeded' ? 'success' : 'danger'}>{call.outcome}</Badge></div><p className="mt-2 break-all font-mono text-xs text-muted">{call.path}</p><time dateTime={call.timestamp} className="mt-2 block text-xs text-muted">{formatSessionTime(call.timestamp)} UTC</time></li>)}</ul>}
        {tab === 'Files' && <ul>{investigation.files.map(file => <li key={file.path} className="p-4"><h3 className="break-all font-mono text-sm font-medium">{file.path}</h3><div className="mt-3 flex flex-wrap gap-2">{file.actions.map(action => <Badge key={action} tone={action === 'Update failed' ? 'danger' : 'neutral'}>{action}</Badge>)}</div></li>)}</ul>}
        {tab === 'Prompts' && <div className="p-4"><p className="mb-4 text-xs leading-5 text-muted">Sanitized demo summaries, not original user prompt text. No private content is included.</p><ol className="space-y-4">{investigation.prompts.map(prompt => <li key={prompt.id}><time dateTime={prompt.timestamp} className="text-xs text-muted">{formatSessionTime(prompt.timestamp)} UTC</time><p className="mt-1 text-sm leading-6">{prompt.summary}</p></li>)}</ol></div>}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted">Sanitized prototype events · All timestamps are UTC.</p>
    </Card>
  )
}

function Metadata({ label, icon, separator, children }: { label: string; icon: ReactNode; separator?: boolean; children: ReactNode }) {
  return <div className={`flex min-w-0 items-start gap-3 px-1 ${separator ? 'sm:border-l sm:border-line sm:pl-7' : ''}`}><span aria-hidden="true" className="mt-1.5 shrink-0">{icon}</span><div className="min-w-0"><dt className="text-[13px] leading-5 text-muted">{label}</dt><dd className="mt-0.5 break-words text-base font-medium leading-6">{children}</dd></div></div>
}
