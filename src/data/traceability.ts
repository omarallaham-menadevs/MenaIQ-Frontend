import { dailyActivity, parsePeriod, type Period } from './companyOverview.ts'
import { employees, entitySessions, type EntitySession } from './entityAnalytics.ts'
import { getSessionInvestigation, sessionRepositories } from './sessions.ts'

export const traceTabs = ['Commits', 'Pull Requests', 'Reviews', 'Repositories'] as const
export type TraceTab = typeof traceTabs[number]
export type LinkStatus = 'Verified' | 'Unverified' | 'Unlinked'
export type PullRequestState = 'Open' | 'Merged' | 'Closed'
export type CommitFile = { path: string; additions: number; deletions: number }
export type DemoRepository = { id: string; name: string; defaultBranch: string; exampleUrl: string; connected: false }
export type DemoCommit = { sha: string; shortSha: string; message: string; repository: string; authorId: string; committedAt: string; branch: string; files: CommitFile[] }
export type TraceEvidence = { id: string; kind: 'Demo collector commit reference' | 'Temporal candidate'; sessionId: string; commitSha: string; repository: string; authorId: string; recordedAt: string; note: string }
export type TraceLink = { commitSha: string; sessionId: string | null; status: LinkStatus; evidence: TraceEvidence | null }
export type DemoPullRequest = { id: number; title: string; repository: string; authorId: string; branch: string; baseBranch: string; state: PullRequestState; createdAt: string; mergedAt: string | null; commitShas: string[] }
export type DemoReview = { id: string; pullRequestId: number; reviewerId: string; state: 'Approved' | 'Commented' | 'Changes Requested'; submittedAt: string; summary: string }

// Public example history only. Synthetic SHAs and repositories are not hosted here.
export const publicGitHubExample = 'https://github.com/octocat/Hello-World/commits/master/'
export const traceRepositories: DemoRepository[] = sessionRepositories.map(name => ({ id: name, name, defaultBranch: 'main', exampleUrl: publicGitHubExample, connected: false }))
const messages = ['Add authentication to booking flow', 'Fix null reference in payment service', 'Update frontend components and styles', 'Refactor data processing pipeline', 'Add unit tests for booking service', 'Improve error handling and logs', 'Update API documentation', 'Optimize database queries', 'Add search filters', 'Fix UI alignment issue']
const seeds = [
  ['a7f3d9e', 'web-platform', '2026-11-12T14:32:00Z', 'SES-1084'],
  ['b4e1c2f', 'billing-api', '2026-11-12T13:18:00Z', 'SES-1083'],
  ['c9d8e7a', 'frontend-app', '2026-11-12T11:40:00Z', 'SES-1082'],
  ['d2f6b1c', 'data-pipeline', '2026-11-11T17:22:00Z', 'SES-1081'],
  ['e5a9d4b', 'web-platform', '2026-11-11T15:09:00Z'],
  ['f1c7a8e', 'billing-api', '2026-11-10T16:37:00Z'],
  ['a3d2b9f', 'billing-api', '2026-11-10T13:25:00Z'],
  ['b8e4c1d', 'data-pipeline', '2026-11-10T11:08:00Z'],
  ['c6f9a2b', 'web-platform', '2026-11-09T18:20:00Z'],
  ['d7a1e9c', 'frontend-app', '2026-11-09T16:45:00Z'],
]

function sourceSession(repository: string, time: string, id?: string): EntitySession {
  const session = id ? entitySessions.find(item => item.id === id) : entitySessions.find(item => item.repository === repository && item.lastActivity <= time)
  if (!session) throw new Error(`Missing traceability fixture source: ${repository}`)
  return session
}

const sources: EntitySession[] = []
export const traceCommits: DemoCommit[] = Array.from({ length: 60 }, (_, index) => {
  const seed = seeds[index]
  const repository = seed?.[1] ?? sessionRepositories[index % sessionRepositories.length]
  const time = seed?.[2] ?? (index < 40
    ? new Date(Date.parse('2026-11-08T12:00:00Z') - Math.floor((index - 10) * 25 / 29) * 86_400_000 + (index % 4) * 3_600_000).toISOString()
    : new Date(Date.parse('2026-09-15T12:00:00Z') + (index - 40) * 86_400_000).toISOString())
  const session = sourceSession(repository, time, seed?.[3])
  sources.push(session)
  const shortSha = seed?.[0] ?? (0x1000000 + index * 7919).toString(16).padStart(7, '0')
  const sha = (shortSha + (index + 1).toString(16).padStart(33, '0')).slice(0, 40)
  const path = getSessionInvestigation(session).files[0].path
  return {
    sha, shortSha, repository, authorId: session.employeeId, committedAt: time,
    message: seed ? messages[index] : `${messages[index % messages.length]} (demo ${index + 1})`,
    branch: index === 0 ? 'feature/auth-booking' : `${index % 2 ? 'fix' : 'feature'}/demo-${index + 1}`,
    files: index === 0 ? [
      { path, additions: 82, deletions: 10 },
      { path: 'src/features/booking/auth.ts', additions: 44, deletions: 12 },
      { path: 'src/features/booking/auth.test.ts', additions: 16, deletions: 6 },
    ] : [{ path, additions: 12 + index % 40, deletions: index % 13 }, { path: 'tests/demo-change.test.ts', additions: 8 + index % 17, deletions: index % 5 }],
  }
})

// Verification is never inferred from matching people, repositories, or time.
// Only these explicit, hand-authored synthetic collector records establish it.
export const demoCollectorEvidence: TraceEvidence[] = [
  { id: 'DEMO-EVIDENCE-1', kind: 'Demo collector commit reference', sessionId: 'SES-1084', commitSha: traceCommits[0].sha, repository: 'web-platform', authorId: 'maya', recordedAt: '2026-11-12T14:32:30Z', note: 'Explicit synthetic collector event records this full SHA and session ID. Verified within the demo only; not live GitHub evidence.' },
  { id: 'DEMO-EVIDENCE-4', kind: 'Demo collector commit reference', sessionId: 'SES-1081', commitSha: traceCommits[3].sha, repository: 'data-pipeline', authorId: 'adam', recordedAt: '2026-11-11T17:22:30Z', note: 'Explicit synthetic collector event records this full SHA and session ID. Verified within the demo only; not live GitHub evidence.' },
]

export const traceLinks: TraceLink[] = traceCommits.map((commit, index) => {
  const session = sources[index]
  const explicit = demoCollectorEvidence.find(evidence => evidence.commitSha === commit.sha)
  const status: LinkStatus = explicit ? 'Verified' : index % 3 === 2 ? 'Unlinked' : 'Unverified'
  return {
    commitSha: commit.sha, sessionId: explicit?.sessionId ?? (status === 'Unlinked' ? null : session.id), status,
    evidence: explicit ?? (status === 'Unlinked' ? null : {
      id: `DEMO-CANDIDATE-${index + 1}`, kind: 'Temporal candidate',
      sessionId: session.id, commitSha: commit.sha, repository: commit.repository, authorId: commit.authorId,
      recordedAt: new Date(Date.parse(commit.committedAt) + 30_000).toISOString(),
      note: 'Same author and repository with earlier session activity. Time proximity is a candidate association, not proof of AI authorship.',
    }),
  }
})

export const tracePullRequests: DemoPullRequest[] = traceCommits.filter((_, index) => index % 4 === 0).map((commit, index) => ({
  id: 101 + index, title: commit.message, repository: commit.repository, authorId: commit.authorId,
  branch: commit.branch, baseBranch: 'main', state: (['Merged', 'Open', 'Closed'] as const)[index % 3],
  createdAt: new Date(Date.parse(commit.committedAt) + 5 * 60_000).toISOString(),
  mergedAt: index % 3 === 0 ? new Date(Date.parse(commit.committedAt) + 20 * 60_000).toISOString() : null,
  commitShas: [commit.sha],
}))

export const traceReviews: DemoReview[] = tracePullRequests.map((pr, index) => ({
  id: `REV-${101 + index}`, pullRequestId: pr.id,
  reviewerId: employees[(employees.findIndex(employee => employee.id === pr.authorId) + 1) % 4].id,
  state: pr.state === 'Merged' ? 'Approved' : pr.state === 'Closed' ? 'Changes Requested' : 'Commented',
  submittedAt: new Date(Date.parse(pr.createdAt) + 5 * 60_000).toISOString(),
  summary: pr.state === 'Merged' ? 'Demo review approved the scoped change.' : pr.state === 'Closed' ? 'Demo review requested changes before approval.' : 'Demo reviewer left feedback on the proposed change.',
}))

export function commitLink(commit: DemoCommit) { return traceLinks.find(link => link.commitSha === commit.sha)! }
export function commitPr(commit: DemoCommit) { return tracePullRequests.find(pr => pr.commitShas.includes(commit.sha)) }
export function commitMergeState(commit: DemoCommit): 'Merged' | 'Committed' {
  const pr = commitPr(commit)
  return pr?.state === 'Merged' && pr.mergedAt && pr.mergedAt >= commit.committedAt ? 'Merged' : 'Committed'
}
export function authorName(id: string) { return employees.find(employee => employee.id === id)?.name ?? 'Not Available' }
export function traceRowId(row: DemoCommit | DemoPullRequest | DemoReview | DemoRepository): string { return 'sha' in row ? row.sha : String(row.id) }

export type TraceFilters = { query: string; repository: string; author: string; branch: string; linkStatus: string; prState: string; period: Period }
export function parseTraceFilters(params: URLSearchParams): TraceFilters {
  return { query: params.get('q') ?? '', repository: params.get('repository') ?? '', author: params.get('author') ?? '', branch: params.get('branch') ?? '', linkStatus: params.get('linkStatus') ?? '', prState: params.get('prState') ?? '', period: parsePeriod(params.get('period')) }
}
function includesQuery(query: string, values: string[]) { return !query.trim() || values.some(value => value.toLowerCase().includes(query.trim().toLowerCase())) }
function inPeriod(timestamp: string, period: Period) { return timestamp.slice(0, 10) >= dailyActivity.at(-period)!.date && timestamp.slice(0, 10) <= dailyActivity.at(-1)!.date }
function matchesScope(commit: DemoCommit, filters: TraceFilters) {
  return (!filters.repository || commit.repository === filters.repository)
    && (!filters.author || commit.authorId === filters.author)
    && (!filters.branch || commit.branch === filters.branch)
    && (!filters.linkStatus || commitLink(commit).status === filters.linkStatus)
    && (!filters.prState || (commitPr(commit)?.state ?? 'No PR') === filters.prState)
}
export function filterCommits(filters: TraceFilters) {
  return traceCommits.filter(commit => inPeriod(commit.committedAt, filters.period) && matchesScope(commit, filters) && includesQuery(filters.query, [commit.sha, commit.message, commit.repository, authorName(commit.authorId)]))
    .sort((a, b) => b.committedAt.localeCompare(a.committedAt) || a.sha.localeCompare(b.sha))
}
export function filterPullRequests(filters: TraceFilters) {
  return tracePullRequests.filter(pr => inPeriod(pr.createdAt, filters.period) && pr.commitShas.some(sha => matchesScope(traceCommits.find(commit => commit.sha === sha)!, filters)) && includesQuery(filters.query, [String(pr.id), pr.title, pr.repository, authorName(pr.authorId)]))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export function filterReviews(filters: TraceFilters) {
  return traceReviews.filter(review => {
    const pr = tracePullRequests.find(item => item.id === review.pullRequestId)!
    const commit = traceCommits.find(item => item.sha === pr.commitShas[0])!
    return inPeriod(review.submittedAt, filters.period) && matchesScope(commit, { ...filters, author: '' })
      && (!filters.author || review.reviewerId === filters.author)
      && includesQuery(filters.query, [review.id, pr.title, pr.repository, authorName(review.reviewerId)])
  }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}
export function filterRepositories(filters: TraceFilters) {
  return traceRepositories.map(repository => {
    const commits = filterCommits({ ...filters, repository: repository.name })
    return { ...repository, commits, pullRequests: tracePullRequests.filter(pr => pr.commitShas.some(sha => commits.some(commit => commit.sha === sha))), reviews: traceReviews.filter(review => tracePullRequests.find(pr => pr.id === review.pullRequestId)!.commitShas.some(sha => commits.some(commit => commit.sha === sha))) }
  }).filter(repository => (!filters.repository || repository.name === filters.repository) && repository.commits.length > 0)
}

export function tracePage<T>(rows: T[], requested: number) {
  const pageCount = Math.ceil(rows.length / 10)
  const page = Math.max(1, Math.min(Number.isFinite(requested) ? Math.floor(requested) : 1, pageCount || 1))
  const offset = (page - 1) * 10
  return { page, pageCount, rows: rows.slice(offset, offset + 10), start: rows.length ? offset + 1 : 0, end: Math.min(offset + 10, rows.length), total: rows.length }
}
