import type { KeyboardEvent, ReactNode } from 'react'
import { ArrowDownUp, ChevronLeft, ChevronRight } from 'lucide-react'
import type { EntitySession } from '../../data/entityAnalytics'
import { formatDuration } from '../../data/entityAnalytics'
import { formatActivity } from '../../data/companyOverview'
import { getPaginationItems, type getSessionPage } from '../../data/sessions'
import { SessionStatus } from '../overview/SessionStatus'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'

export function SessionsTable({ result, total, selectedId, ascending, onSort, onPage, onSelect, onReset }: { result: ReturnType<typeof getSessionPage>; total: number; selectedId: string | null; ascending: boolean; onSort: () => void; onPage: (page: number) => void; onSelect: (id: string) => void; onReset: () => void }) {
  function navigateRow(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowDown' ? Math.min(index + 1, result.rows.length - 1) : event.key === 'ArrowUp' ? Math.max(index - 1, 0) : event.key === 'Home' ? 0 : event.key === 'End' ? result.rows.length - 1 : null
    if (next === null) return
    event.preventDefault()
    onSelect(result.rows[next].id)
    document.getElementById(`session-row-${next}`)?.focus()
  }

  return (
    <Card className="flex min-w-0 flex-col px-3 py-5 2xl:min-h-[750px]">
      <h2 className="mb-[22px] px-2 text-[25px] font-bold leading-8 tracking-tight">Sessions ({total.toLocaleString('en-US')})</h2>
      {total === 0 ? <EmptyState title="No sessions found" description="No sessions match the selected search and filters." action={<Button variant="secondary" onClick={onReset}>Reset filters</Button>} /> : (
        <div role="region" aria-label="Sessions table, scroll horizontally on small screens" tabIndex={0} className="overflow-x-auto rounded-lg">
          <table className="w-full min-w-[640px] table-fixed text-left text-sm">
            <caption className="sr-only">Matching prototype session records. Start times are UTC. Select a session ID, or use Up and Down arrow keys on session buttons to select adjacent rows.</caption>
            <colgroup>{['16%', '17%', '16%', '20%', '12%', '19%'].map(width => <col key={width} style={{ width }} />)}</colgroup>
            <thead className="bg-neutral"><tr><th scope="col" aria-sort={ascending ? 'ascending' : 'descending'} className="px-3 font-semibold"><button type="button" onClick={onSort} className="inline-flex min-h-11 items-center gap-1.5 rounded whitespace-nowrap" aria-label="Sort sessions by ID">Session ID<ArrowDownUp size={14} aria-hidden="true" /></button></th>{['Employee', 'Agent', 'Start Time', 'Duration', 'Status'].map(title => <th key={title} scope="col" className="px-2 py-3 font-semibold">{title}</th>)}</tr></thead>
            <tbody>{result.rows.map((session, index) => <SessionRow key={session.id} session={session} index={index} selected={selectedId === session.id} onSelect={onSelect} onKeyDown={event => navigateRow(event, index)} />)}</tbody>
          </table>
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 px-2 pt-6 text-sm">
        <p role="status">{result.start}–{result.end} of {total.toLocaleString('en-US')}</p>
        {result.pageCount > 1 && <nav aria-label="Sessions pagination" className="flex items-center gap-1.5"><PageButton label="Previous page" disabled={result.page === 1} onClick={() => onPage(result.page - 1)}><ChevronLeft size={17} aria-hidden="true" /></PageButton>{getPaginationItems(result.page, result.pageCount).map((item, index) => item === 'ellipsis' ? <span key={`gap-${index}`} className="px-1.5">…</span> : <button type="button" key={item} aria-label={`Page ${item}`} aria-current={result.page === item ? 'page' : undefined} onClick={() => onPage(item)} className={`min-h-9 min-w-9 rounded-lg px-2 ${result.page === item ? 'bg-success-soft font-semibold text-success' : 'hover:bg-neutral'}`}>{item}</button>)}<PageButton label="Next page" disabled={result.page === result.pageCount} onClick={() => onPage(result.page + 1)}><ChevronRight size={17} aria-hidden="true" /></PageButton></nav>}
      </div>
    </Card>
  )
}

function SessionRow({ session, index, selected, onSelect, onKeyDown }: { session: EntitySession; index: number; selected: boolean; onSelect: (id: string) => void; onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void }) {
  const displayId = session.id.length > 14 ? `${session.id.slice(0, 4)}…${session.id.slice(-2)}` : session.id
  return <tr className={`h-[55px] cursor-pointer border-b border-line/40 ${selected ? 'bg-selected' : 'hover:bg-canvas'}`} onClick={event => { if (!(event.target as HTMLElement).closest('button')) onSelect(session.id) }}>
    <th scope="row" className="px-3 py-2 font-bold"><button type="button" id={`session-row-${index}`} data-session-id={session.id} aria-label={`View session ${session.id}`} aria-pressed={selected} aria-controls="session-detail-panel" onClick={() => onSelect(session.id)} onKeyDown={onKeyDown} title={session.id} className={`block max-w-full truncate rounded py-2 text-left ${selected ? 'text-success' : 'hover:text-accent'}`}>{displayId}</button></th>
    <td className="px-2 py-2">{session.employee}</td><td className="px-2 py-2">{session.agent}</td><td className="whitespace-nowrap px-2 py-2"><time dateTime={session.startedAt} title="UTC">{formatActivity(session.startedAt)}</time></td><td className="whitespace-nowrap px-2 py-2">{formatDuration(session.durationSeconds)}</td><td className="px-1 py-2 [&_span]:gap-1.5 [&_span]:whitespace-nowrap [&_span]:px-2 [&_span]:text-[13px]"><SessionStatus status={session.status} /></td>
  </tr>
}

function PageButton({ children, label, disabled, onClick }: { children: ReactNode; label: string; disabled: boolean; onClick: () => void }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex size-9 items-center justify-center rounded-lg border border-line hover:bg-neutral disabled:cursor-not-allowed disabled:opacity-40">{children}</button>
}
