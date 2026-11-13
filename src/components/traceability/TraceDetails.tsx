import type { ReactNode } from 'react'
import { CalendarDays, CircleCheck, CodeXml, FileText, GitBranch, Link2, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { authorName, commitLink, commitMergeState, commitPr, traceCommits, tracePullRequests, traceReviews, type DemoCommit, type DemoPullRequest, type DemoReview, type TraceTab } from '../../data/traceability'
import { formatActivity, type Period } from '../../data/companyOverview'
import { entitySessions } from '../../data/entityAnalytics'
import { SessionStatus } from '../overview/SessionStatus'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ExampleLink, TraceState, type TraceRow } from './TraceTable'
import { TraceTabs } from './TraceTabs'

const commitDetailTabs = ['Details', 'Related Sessions'] as const
export type CommitDetailTab = typeof commitDetailTabs[number]

export function TraceDetails({ row, tab, detailTab, period, onDetailTab, onClose, onCommit, onPullRequest }: { row: TraceRow | null; tab: TraceTab; detailTab: CommitDetailTab; period: Period; onDetailTab: (tab: CommitDetailTab) => void; onClose: () => void; onCommit: (commit: DemoCommit) => void; onPullRequest: (pr: DemoPullRequest) => void }) {
  return <Card id="trace-detail-pane" className="min-w-0 px-[18px] py-4 2xl:min-h-[655px]">
    {!row ? <EmptyState title="No record selected" description={`Select a ${tab === 'Commits' ? 'commit' : tab === 'Pull Requests' ? 'pull request' : tab === 'Reviews' ? 'review' : 'repository'} from the table to inspect its demo details.`} /> : <>
      <div className="flex items-center gap-5"><h2 className="min-w-0 break-words text-[26px] font-bold leading-8 tracking-tight">{'sha' in row ? row.shortSha : 'commitShas' in row ? `PR #${row.id}` : row.id}</h2>{'sha' in row && <><ExampleLink />{commitMergeState(row) === 'Merged' ? <button type="button" className="rounded-full" onClick={() => onPullRequest(commitPr(row)!)} title={`Supporting demo PR #${commitPr(row)!.id} merged at ${commitPr(row)!.mergedAt}`} aria-label={`View merge evidence in demo PR ${commitPr(row)!.id}`}><Badge tone="success" className="gap-2 text-sm font-semibold"><CircleCheck size={17} aria-hidden="true" />Merged</Badge></button> : <TraceState>Committed</TraceState>}</>}{'commitShas' in row && <TraceState>{row.state}</TraceState>}{'reviewerId' in row && <TraceState>{row.state}</TraceState>}{'connected' in row && <TraceState>Demo only</TraceState>}<button type="button" onClick={onClose} aria-label="Close traceability details" className="ml-auto shrink-0 rounded p-1 hover:bg-neutral"><X size={20} aria-hidden="true" /></button></div>
      {'sha' in row ? <CommitDetails commit={row} detailTab={detailTab} period={period} onDetailTab={onDetailTab} /> : 'commitShas' in row ? <PullRequestDetails pr={row} onCommit={onCommit} /> : 'reviewerId' in row ? <ReviewDetails review={row} onPullRequest={onPullRequest} /> : <>
        <p className="mt-3 text-sm leading-6 text-muted">Prototype repository. No GitHub integration is connected.</p>
        <dl className="mt-7 grid grid-cols-2 gap-6 text-sm"><div><dt className="text-muted">Default branch</dt><dd className="mt-1 font-medium">{row.defaultBranch}</dd></div><div><dt className="text-muted">Commits in scope</dt><dd className="mt-1 font-medium">{row.commits.length}</dd></div><div><dt className="text-muted">Pull requests</dt><dd className="mt-1 font-medium">{row.pullRequests.length}</dd></div><div><dt className="text-muted">Reviews</dt><dd className="mt-1 font-medium">{row.reviews.length}</dd></div></dl>
        <h3 className="mt-8 text-base font-semibold">Commits in this period</h3><ul className="mt-3 divide-y divide-line">{row.commits.slice(0, 10).map(commit => <li key={commit.sha}><button type="button" onClick={() => onCommit(commit)} className="block w-full rounded py-3 text-left text-sm hover:bg-canvas"><span className="font-semibold text-accent">{commit.shortSha}</span><span className="ml-3">{commit.message}</span></button></li>)}</ul>
      </>}
    </>}
  </Card>
}

function CommitDetails({ commit, detailTab, period, onDetailTab }: { commit: DemoCommit; detailTab: CommitDetailTab; period: Period; onDetailTab: (tab: CommitDetailTab) => void }) {
  const link = commitLink(commit)
  const session = entitySessions.find(item => item.id === link.sessionId)
  return <>
    <p className="mt-2 text-base leading-6">{commit.message}</p>
    <dl className="mt-7 grid grid-cols-1 gap-y-7 sm:grid-cols-2">
      <Metadata label="Repository" icon={<CodeXml size={22} />}>{commit.repository}</Metadata><Metadata label="Time" icon={<CalendarDays size={22} />} separator><time dateTime={commit.committedAt} title="UTC">{formatActivity(commit.committedAt)}</time></Metadata>
      <Metadata label="Author" icon={<UserRound size={22} />}><Link to={`/entity-analytics?entity=${commit.authorId}&period=${period}`} className="rounded hover:text-accent hover:underline">{authorName(commit.authorId)}</Link></Metadata><Metadata label="Branch" icon={<GitBranch size={22} />} separator>{commit.branch}</Metadata>
    </dl>
    <div className="mt-10"><TraceTabs items={commitDetailTabs} selected={detailTab} onChange={onDetailTab} id="commit-detail-tab" label="Commit details" panelId="commit-detail-content" detail /></div>
    <div id="commit-detail-content" role="tabpanel" aria-labelledby={`commit-detail-tab-${commitDetailTabs.indexOf(detailTab)}`} tabIndex={0} className="mt-[18px] rounded-xl">
      {detailTab === 'Details' && <Card className="flex items-center gap-4 px-3.5 py-4"><span aria-hidden="true" className="flex size-[43px] shrink-0 items-center justify-center rounded-full bg-neutral"><FileText size={22} /></span><div><h3 className="text-lg font-semibold">Changes</h3><p className="text-sm text-muted">{commit.files.length} files changed</p></div><div className="ml-auto flex gap-2"><Badge tone="success" className="font-semibold">+{commit.files.reduce((sum, file) => sum + file.additions, 0)}</Badge><Badge tone="danger" className="font-semibold">−{commit.files.reduce((sum, file) => sum + file.deletions, 0)}</Badge></div></Card>}
      <Card className={`px-3.5 py-4 ${detailTab === 'Details' ? 'mt-4' : ''}`}>
        <div className="flex flex-wrap items-center gap-4"><span aria-hidden="true" className="flex size-[43px] shrink-0 items-center justify-center rounded-full bg-neutral"><Link2 size={22} /></span><div><h3 className="text-lg font-semibold">{link.status === 'Unverified' ? 'Candidate Sessions' : 'Linked Sessions'}</h3><p className="text-sm text-muted">{session ? '1 session' : '0 sessions'}</p></div><span className="ml-auto" title={link.evidence?.note ?? 'No session relationship is recorded.'}><TraceState demo>{link.status}</TraceState></span></div>
        {session ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"><Link to={`/sessions?session=${encodeURIComponent(session.id)}&period=${period}`} className="min-w-0 break-all rounded text-sm font-semibold text-success underline" aria-label={`Open linked session ${session.id}`}>{session.id}</Link><span className="text-sm sm:border-l sm:border-line sm:pl-7">{session.agent}</span><SessionStatus status={session.status} /></div> : <p className="mt-4 text-sm leading-6 text-muted">No session linked. AI attribution is not available for this demo commit.</p>}
        {detailTab === 'Related Sessions' && <div className="mt-5 space-y-3 border-t border-line pt-4 text-sm leading-6"><p className="font-semibold">{link.evidence?.kind ?? 'No link evidence'}</p><p className="text-muted">{link.evidence?.note ?? 'Unlinked does not establish whether AI tools were used.'}</p>{link.evidence && <dl className="space-y-2 text-xs"><div><dt className="text-muted">Demo evidence ID</dt><dd>{link.evidence.id}</dd></div><div><dt className="text-muted">Commit SHA</dt><dd className="break-all font-mono">{link.evidence.commitSha}</dd></div><div><dt className="text-muted">Recorded at (UTC)</dt><dd>{formatActivity(link.evidence.recordedAt)}</dd></div></dl>}</div>}
      </Card>
      {detailTab === 'Details' && <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer rounded py-1">View changed file counts</summary><ul className="mt-2 space-y-2">{commit.files.map(file => <li key={file.path} className="break-all"><code>{file.path}</code> <span className="text-success">+{file.additions}</span> <span className="text-danger">−{file.deletions}</span></li>)}</ul></details>}
    </div>
  </>
}

function PullRequestDetails({ pr, onCommit }: { pr: DemoPullRequest; onCommit: (commit: DemoCommit) => void }) {
  return <><p className="mt-3 text-base leading-6">{pr.title}</p><dl className="mt-7 grid grid-cols-2 gap-5 text-sm"><div><dt className="text-muted">Repository</dt><dd className="mt-1 font-medium">{pr.repository}</dd></div><div><dt className="text-muted">Author</dt><dd className="mt-1 font-medium">{authorName(pr.authorId)}</dd></div><div><dt className="text-muted">Branch</dt><dd className="mt-1 break-all font-medium">{pr.branch} → {pr.baseBranch}</dd></div><div><dt className="text-muted">{pr.mergedAt ? 'Merged at (UTC)' : 'Created at (UTC)'}</dt><dd className="mt-1 font-medium">{formatActivity(pr.mergedAt ?? pr.createdAt)}</dd></div></dl><h3 className="mt-8 text-lg font-semibold">Included commits</h3><ul className="mt-3 divide-y divide-line">{pr.commitShas.map(sha => { const commit = traceCommits.find(item => item.sha === sha)!; return <li key={sha}><button type="button" onClick={() => onCommit(commit)} className="w-full rounded py-3 text-left text-sm hover:bg-canvas"><span className="font-semibold text-accent">{commit.shortSha}</span><span className="ml-3">{commit.message}</span></button></li> })}</ul><h3 className="mt-7 text-lg font-semibold">Reviews</h3><ul className="mt-3 space-y-4">{traceReviews.filter(review => review.pullRequestId === pr.id).map(review => <li key={review.id} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{authorName(review.reviewerId)}</span><TraceState>{review.state}</TraceState></div><p className="mt-2 text-sm text-muted">{review.summary}</p></li>)}</ul><p className="mt-5 text-xs text-muted">Explicit demo PR state; not live GitHub information.</p></>
}
function ReviewDetails({ review, onPullRequest }: { review: DemoReview; onPullRequest: (pr: DemoPullRequest) => void }) {
  const pr = tracePullRequests.find(item => item.id === review.pullRequestId)!
  return <><dl className="mt-7 space-y-5 text-sm"><div><dt className="text-muted">Reviewer</dt><dd className="mt-1 font-medium">{authorName(review.reviewerId)}</dd></div><div><dt className="text-muted">Repository</dt><dd className="mt-1 font-medium">{pr.repository}</dd></div><div><dt className="text-muted">Submitted at (UTC)</dt><dd className="mt-1 font-medium">{formatActivity(review.submittedAt)}</dd></div></dl><p className="mt-6 text-sm leading-6">{review.summary}</p><button type="button" onClick={() => onPullRequest(pr)} className="mt-6 rounded-lg bg-selected px-4 py-2 text-sm font-medium text-accent">Open demo PR #{pr.id}</button><p className="mt-6 text-xs text-muted">Prototype review. No real GitHub review was submitted.</p></>
}
function Metadata({ label, icon, separator, children }: { label: string; icon: ReactNode; separator?: boolean; children: ReactNode }) {
  return <div className={`flex min-w-0 items-start gap-5 px-3 ${separator ? 'sm:border-l sm:border-line sm:pl-7' : ''}`}><span aria-hidden="true" className="mt-1.5 shrink-0">{icon}</span><div className="min-w-0"><dt className="text-xs leading-5 text-muted">{label}</dt><dd className="mt-0.5 break-words text-sm font-semibold leading-6">{children}</dd></div></div>
}
