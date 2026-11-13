export const periods = [7, 30, 90] as const
export type Period = typeof periods[number]
export type PreviewState = 'ready' | 'loading' | 'empty' | 'error'

export type DailyActivity = {
  date: string
  sessions: number
  measuredTokens: number
  costCents: number
}

export type Session = {
  id: string
  employee: string
  agent: string
  repository: string
  status: 'Completed' | 'Interrupted' | 'Failed'
  lastActivity: string
}

// Fixed UTC fixtures keep the prototype reproducible regardless of local date or timezone.
export const reportingEnd = '2026-11-12'
const dayMs = 86_400_000
const endTime = Date.parse(reportingEnd + 'T00:00:00Z')
const referenceShape = [44, 54, 55, 64, 62, 71, 69, 76, 72, 81, 75, 82, 92, 87, 96, 85, 91, 101, 96, 102, 97, 109, 107, 113, 105, 117, 114, 121, 117, 126]

// Retain the reference's trend shape while making daily counts sum to the 1,284 total.
function allocate(total: number, weights: number[]): number[] {
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  let allocated = 0
  let cumulativeWeight = 0
  return weights.map(weight => {
    cumulativeWeight += weight
    const next = Math.round(total * cumulativeWeight / weightTotal)
    const value = next - allocated
    allocated = next
    return value
  })
}

const recentCounts = allocate(1284, referenceShape)
const recentTokens = allocate(8_420_000, recentCounts)
const recentCosts = allocate(31_840, recentCounts)

export const dailyActivity: DailyActivity[] = Array.from({ length: 90 }, (_, index) => {
  const recentIndex = index - 60
  const sessions = recentIndex >= 0 ? recentCounts[recentIndex] : 12 + Math.floor(index / 4) + (index % 5)
  return {
    date: new Date(endTime - (89 - index) * dayMs).toISOString().slice(0, 10),
    sessions,
    measuredTokens: recentIndex >= 0 ? recentTokens[recentIndex] : sessions * 6500,
    costCents: recentIndex >= 0 ? recentCosts[recentIndex] : Math.round(sessions * 24.5),
  }
})

export const recentSessions: Session[] = [
  { id: 'SES-1084', employee: 'Maya Haddad', agent: 'Claude Code', repository: 'web-platform', status: 'Completed', lastActivity: '2026-11-12T14:32:00Z' },
  { id: 'SES-1083', employee: 'Omar Saleh', agent: 'Codex', repository: 'billing-api', status: 'Completed', lastActivity: '2026-11-12T13:18:00Z' },
  { id: 'SES-1082', employee: 'Lina Nasser', agent: 'Claude Code', repository: 'frontend-app', status: 'Interrupted', lastActivity: '2026-11-12T11:40:00Z' },
  { id: 'SES-1081', employee: 'Adam Khalil', agent: 'Codex', repository: 'data-pipeline', status: 'Completed', lastActivity: '2026-11-11T17:22:00Z' },
]

export function getOverview(period: Period) {
  const days = dailyActivity.slice(-period)
  return {
    days,
    totalSessions: days.reduce((sum, day) => sum + day.sessions, 0),
    measuredTokens: days.reduce((sum, day) => sum + day.measuredTokens, 0),
    costCents: days.reduce((sum, day) => sum + day.costCents, 0),
    sessions: recentSessions.filter(session => session.lastActivity.slice(0, 10) >= days[0].date && session.lastActivity.slice(0, 10) <= reportingEnd),
    // Findings and collector health are current snapshots, independent of the activity period.
    openFindings: 12,
    criticalFindings: 3,
    collectionIssues: 3,
  }
}

export function formatDay(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(date))
}

export function formatActivity(date: string) {
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(new Date(date))
  return `${formatDay(date)} · ${time}`
}

export function parsePeriod(value: string | null): Period {
  const parsed = Number(value)
  return periods.find(period => period === parsed) ?? 30
}

export function parsePreviewState(value: string | null): PreviewState {
  return value === 'loading' || value === 'empty' || value === 'error' ? value : 'ready'
}
