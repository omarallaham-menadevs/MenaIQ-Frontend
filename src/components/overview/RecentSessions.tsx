import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatActivity, type Session } from '../../data/companyOverview'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { SessionStatus } from './SessionStatus'

export function RecentSessions({ sessions, onSelect }: { sessions: Session[]; onSelect: (session: Session) => void }) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold leading-7 tracking-tight">Recent Sessions</h2>
          <p className="mt-1 text-[13px] text-muted">Latest recorded AI coding sessions</p>
        </div>
        <Link to="/sessions" className="mt-0.5 inline-flex min-h-9 items-center gap-2 rounded-lg bg-selected px-3 text-[13px] font-semibold text-accent hover:bg-success-soft">View all sessions <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
      {sessions.length === 0 ? <EmptyState title="No recent sessions" description="No sessions were recorded in this period." /> : (
        <div role="region" aria-label="Recent sessions table, scroll horizontally on small screens" tabIndex={0} className="overflow-x-auto rounded-lg">
          <table className="w-full min-w-[850px] table-fixed border-collapse text-left text-sm">
            <caption className="sr-only">Latest recorded AI coding sessions. Select a session ID to view details. Last activity times are UTC.</caption>
            <colgroup>{['12.2%', '14.6%', '13.5%', '16.7%', '18%', '25%'].map(width => <col key={width} style={{ width }} />)}</colgroup>
            <thead className="bg-neutral">
              <tr>{['Session ID', 'Employee', 'Agent', 'Repository', 'Status', 'Last Activity'].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3.5 py-2.5 font-semibold">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {sessions.map(session => (
                <tr key={session.id} className="hover:bg-canvas">
                  <th scope="row" className="px-3.5 py-[5px] font-semibold"><button type="button" onClick={() => onSelect(session)} aria-label={`View session ${session.id}`} className="rounded py-1 hover:text-accent hover:underline">{session.id}</button></th>
                  <td className="whitespace-nowrap px-3.5 py-[5px]">{session.employee}</td>
                  <td className="whitespace-nowrap px-3.5 py-[5px]">{session.agent}</td>
                  <td className="px-3.5 py-[5px]">{session.repository}</td>
                  <td className="px-3.5 py-[5px]"><SessionStatus status={session.status} /></td>
                  <td className="whitespace-nowrap px-3.5 py-[5px]"><time dateTime={session.lastActivity} title="UTC">{formatActivity(session.lastActivity)}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
