import { dailyActivity, parsePeriod, type Period } from './companyOverview.ts'
import { devices, entitySessions } from './entityAnalytics.ts'
import { usageRequests } from './usageAndCost.ts'
import { traceCommits, tracePullRequests, traceRepositories, traceReviews } from './traceability.ts'

export type SourceId = 'collectors' | 'litellm' | 'github'
export type SourceHealth = 'Healthy' | 'Delayed' | 'Degraded' | 'Disconnected' | 'Not Configured'
export type CoverageState = 'ready' | 'loading' | 'empty' | 'error' | 'unavailable' | 'not-configured' | 'degraded'
export type CollectionIssue = { id: string; title: string; description: string; href: string; linkLabel: string }
export type SourceEvent = { id: string; title: string; at: string; status: SourceHealth }
export type ReportingSource = {
  id: SourceId; name: string; description: string; subtitle: string
  configured: boolean; reportingAvailable: boolean; lastObservation: string | null
  expectedIntervalMinutes: number; degraded: boolean; scope: string; limitation: string
  issues: CollectionIssue[]; events: SourceEvent[]
}

const latest = (values: string[]) => values.reduce((a, b) => a > b ? a : b)
const gatewayLatest = latest(usageRequests.map(request => request.timestamp))
const githubLatest = latest([...traceCommits.map(commit => commit.committedAt), ...traceReviews.map(review => review.submittedAt), ...tracePullRequests.flatMap(pr => pr.mergedAt ? [pr.mergedAt] : [])])
// Fixed demo snapshot, after all supplied records. No wall-clock connectivity check.
export const coverageSnapshotAt = new Date(Math.max(Date.parse(gatewayLatest), Date.parse(githubLatest)) + 47 * 60_000).toISOString()
const collectorHeartbeat = new Date(Date.parse(coverageSnapshotAt) - 2 * 60_000).toISOString()
const unavailableDevice = devices.find(device => !device.telemetryAvailable)!
const reportingDevices = devices.filter(device => device.telemetryAvailable)

function events(id: SourceId, label: string, lastObservation: string, delayed: boolean): SourceEvent[] {
  return [
    ...(delayed ? [{ id: `${id}-delay`, title: `${label} reporting delayed (demo)`, at: coverageSnapshotAt, status: 'Delayed' as const }] : []),
    ...dailyActivity.map(day => ({ id: `${id}-${day.date}`, title: `${label} report recorded (demo)`, at: day.date === lastObservation.slice(0, 10) ? lastObservation : `${day.date}T09:00:00Z`, status: 'Healthy' as const })),
  ].sort((a, b) => b.at.localeCompare(a.at))
}

export const reportingSources: ReportingSource[] = [
  {
    id: 'collectors', name: 'Local Collectors', description: 'Device sessions and local activity', subtitle: `${reportingDevices.length} reporting demo devices`,
    configured: true, reportingAvailable: true, lastObservation: collectorHeartbeat, expectedIntervalMinutes: 5, degraded: false,
    scope: `${reportingDevices.length} of ${devices.length} demo devices report local telemetry.`,
    limitation: 'A healthy heartbeat describes collector reporting only. Unsupported agents, redacted content, offline devices, and activity outside the collector remain unobserved. Local collectors do not provide gateway token measurements.',
    issues: [{ id: 'collector-unavailable', title: 'Device telemetry is unavailable', description: `${unavailableDevice.name} has no available collector telemetry. Missing reports are Not Captured, not zero activity.`, href: `/entity-analytics?type=device&entity=${unavailableDevice.id}`, linkLabel: 'View device details' }],
    events: events('collectors', 'Collector', collectorHeartbeat, false),
  },
  {
    id: 'litellm', name: 'LiteLLM Gateway', description: 'Measured requests and token usage', subtitle: 'Gateway reporting delay detected',
    configured: true, reportingAvailable: true, lastObservation: gatewayLatest, expectedIntervalMinutes: 5, degraded: false,
    scope: 'Gateway-observed requests associated with the existing demo employees and sessions.',
    limitation: 'Delayed reporting may leave recent usage incomplete, as flagged on Company Overview. Only gateway-observed tokens are measured; activity bypassing the gateway is not included. Missing cost bases remain Not Available.',
    issues: [{ id: 'litellm-delay', title: 'LiteLLM reporting is delayed', description: 'Token usage may be incomplete. Existing observed requests remain available; missing or delayed observations must not be counted as zero.', href: '/usage-cost', linkLabel: 'View usage details' }],
    events: events('litellm', 'Gateway', gatewayLatest, true),
  },
  {
    id: 'github', name: 'GitHub Integration', description: 'Commits, PRs, reviews and sync status', subtitle: 'Sync delay detected',
    configured: true, reportingAvailable: true, lastObservation: githubLatest, expectedIntervalMinutes: 15, degraded: false,
    scope: `${traceRepositories.length} demo repositories; commits, pull requests, reviews, approvals, and merges where recorded.`,
    limitation: 'GitHub records are static prototype fixtures. No GitHub integration is actually connected. A healthy sync would not prove that every change is linked to AI activity or that a temporal session candidate is verified.',
    issues: [{ id: 'github-delay', title: 'GitHub sync is delayed', description: 'Recent code traceability records may be incomplete until synchronization resumes in the simulated scenario.', href: '/code-traceability', linkLabel: 'View traceability details' }],
    events: events('github', 'GitHub synchronization', githubLatest, true),
  },
]

export function sourceHealth(source: ReportingSource): SourceHealth {
  if (!source.configured) return 'Not Configured'
  if (!source.reportingAvailable || !source.lastObservation) return 'Disconnected'
  if (source.degraded) return 'Degraded'
  return (Date.parse(coverageSnapshotAt) - Date.parse(source.lastObservation)) / 60_000 > source.expectedIntervalMinutes ? 'Delayed' : 'Healthy'
}
export function parseCoverageState(value: string | null): CoverageState {
  return ['loading', 'empty', 'error', 'unavailable', 'not-configured', 'degraded'].includes(value ?? '') ? value as CoverageState : 'ready'
}
export function coverageSources(state: CoverageState): ReportingSource[] {
  if (state === 'empty') return []
  return reportingSources.map(source => state === 'unavailable' && source.id === 'litellm' ? { ...source, reportingAvailable: false, lastObservation: null, events: [] } : state === 'not-configured' && source.id === 'github' ? { ...source, configured: false, lastObservation: null, events: [], issues: [] } : state === 'degraded' && source.id === 'collectors' ? { ...source, degraded: true } : source)
}
export function parseCoverageFilters(params: URLSearchParams) {
  const health = ['Healthy', 'Delayed', 'Degraded', 'Disconnected', 'Not Configured'].find(value => value.toLowerCase() === params.get('health')?.toLowerCase()) ?? ''
  return { query: params.get('q') ?? '', health, issuesOnly: params.get('filter') === 'issues', period: parsePeriod(params.get('period')) }
}
export function filterCoverageSources(sources: ReportingSource[], filters: ReturnType<typeof parseCoverageFilters>) {
  const query = filters.query.trim().toLowerCase()
  return sources.filter(source => (!filters.health || sourceHealth(source) === filters.health) && (!filters.issuesOnly || source.issues.length > 0) && (!query || [source.name, source.description, source.scope, source.id, ...source.issues.flatMap(issue => [issue.title, issue.description]), ...(source.id === 'collectors' ? devices.map(device => device.name) : [])].some(value => value.toLowerCase().includes(query))))
}
export function sourceObservations(source: ReportingSource, period: Period) {
  const start = dailyActivity.at(-period)!.date
  const end = dailyActivity.at(-1)!.date
  const inPeriod = (date: string) => date.slice(0, 10) >= start && date.slice(0, 10) <= end
  if (!source.configured || !source.reportingAvailable) return { count: null, measuredTokens: null, label: source.id === 'litellm' ? 'requests' : source.id === 'github' ? 'GitHub records' : 'sessions' }
  if (source.id === 'collectors') return { count: entitySessions.filter(session => inPeriod(session.lastActivity)).length, measuredTokens: null, label: 'sessions' }
  if (source.id === 'litellm') {
    const requests = usageRequests.filter(request => inPeriod(request.timestamp))
    const measured = requests.filter(request => request.measuredTokens !== null)
    return { count: requests.length, measuredTokens: measured.length ? measured.reduce((sum, request) => sum + request.measuredTokens!, 0) : null, label: 'requests' }
  }
  return { count: traceCommits.filter(commit => inPeriod(commit.committedAt)).length + tracePullRequests.filter(pr => inPeriod(pr.createdAt)).length + traceReviews.filter(review => inPeriod(review.submittedAt)).length, measuredTokens: null, label: 'GitHub records' }
}
export function sourceEvents(source: ReportingSource, period: Period) {
  const start = dailyActivity.at(-period)!.date
  const end = dailyActivity.at(-1)!.date
  return source.events.filter(event => event.at.slice(0, 10) >= start && event.at.slice(0, 10) <= end)
}
export function observationAge(value: string | null) {
  if (!value) return 'Not Available'
  const minutes = Math.max(0, Math.round((Date.parse(coverageSnapshotAt) - Date.parse(value)) / 60_000))
  return minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min ago`
}
