import { useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatActivity, type Session } from '../../data/companyOverview'
import { formatDuration, type EntityAnalytics, type EntitySession } from '../../data/entityAnalytics'
import { SessionStatus } from '../overview/SessionStatus'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'

export function EntitySessionsTable({ data, all = false, onViewAll, onSelect }: { data: EntityAnalytics; all?: boolean; onViewAll: () => void; onSelect: (session: Session) => void }) {
  const [page, setPage] = useState(0)
  const pageSize = 10
  const pageCount = Math.ceil(data.sessions.length / pageSize)
  const safePage = Math.min(page, Math.max(pageCount - 1, 0))
  const rows = all ? data.sessions.slice(safePage * pageSize, (safePage + 1) * pageSize) : data.sessions.slice(0, 3)

  return (
    <Card className="px-6 py-5">
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[25px] font-bold leading-8 tracking-tight">{all ? 'Sessions' : 'Recent Sessions'}</h2>
          <p className="mt-0.5 text-base leading-6 text-muted">{all ? `${data.sessions.length.toLocaleString('en-US')} sessions` : `Latest ${rows.length} sessions`} for {data.name}</p>
        </div>
        {!all && <Button variant="secondary" onClick={onViewAll} className="min-h-[46px] gap-2 px-3.5 text-sm font-semibold text-success [&]:border-green-200 [&]:bg-selected/40 hover:[&]:bg-selected">View all sessions <ArrowRight size={19} aria-hidden="true" /></Button>}
      </div>
      {rows.length === 0 ? <EmptyState title="No sessions in this period" description={`No sessions were recorded for ${data.name} in the selected date range.`} /> : (
        <div role="region" aria-label="Entity sessions table, scroll horizontally on small screens" tabIndex={0} className="overflow-x-auto rounded-lg">
          <table className="w-full min-w-[950px] table-fixed text-left text-base">
            <caption className="sr-only">Sessions for {data.name}. Select a session ID to view details. Start times are UTC.</caption>
            <colgroup>{['16%', '16.5%', '18.5%', '18.5%', '14%', '16.5%'].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
            <thead className="bg-neutral"><tr>{['Session ID', 'Agent', 'Repository', 'Start Time', 'Duration', 'Status'].map(title => <th key={title} scope="col" className="px-[18px] py-[9px] font-semibold">{title}</th>)}</tr></thead>
            <tbody className="divide-y divide-line/60">
              {rows.map(session => <SessionRow key={session.id} session={session} onSelect={onSelect} />)}
            </tbody>
          </table>
        </div>
      )}
      {all && pageCount > 1 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <p role="status" className="text-muted">Page {safePage + 1} of {pageCount}</p>
        <div className="flex gap-2"><Button variant="secondary" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft size={16} aria-hidden="true" />Previous</Button><Button variant="secondary" disabled={safePage + 1 >= pageCount} onClick={() => setPage(safePage + 1)}>Next<ChevronRight size={16} aria-hidden="true" /></Button></div>
      </div>}
    </Card>
  )
}

function SessionRow({ session, onSelect }: { session: EntitySession; onSelect: (session: Session) => void }) {
  return (
    <tr className="border-b border-line/60 hover:bg-canvas">
      <th scope="row" className="px-[18px] py-2.5 font-bold"><button type="button" aria-label={`View session ${session.id}`} onClick={() => onSelect(session)} className="max-w-full break-words rounded py-1 text-left hover:text-accent hover:underline">{session.id}</button></th>
      <td className="px-[18px] py-2.5">{session.agent}</td>
      <td className="break-words px-[18px] py-2.5">{session.repository}</td>
      <td className="whitespace-nowrap px-[18px] py-2.5"><time dateTime={session.startedAt} title="UTC">{formatActivity(session.startedAt)}</time></td>
      <td className="whitespace-nowrap px-[18px] py-2.5">{formatDuration(session.durationSeconds)}</td>
      <td className="px-[18px] py-2.5 [&_span]:whitespace-nowrap [&_span]:px-4 [&_span]:py-1 [&_span]:text-base [&_span]:font-semibold [&_svg]:size-[18px]"><SessionStatus status={session.status} /></td>
    </tr>
  )
}
