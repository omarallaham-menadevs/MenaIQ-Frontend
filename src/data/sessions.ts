import { dailyActivity, parsePeriod, type Period } from './companyOverview.ts'
import { entitySessions, type EntitySession } from './entityAnalytics.ts'

export const detailTabs = ['Timeline', 'Tool Calls', 'Files', 'Prompts'] as const
export type DetailTab = typeof detailTabs[number]
export const sessionStatuses = ['Completed', 'Interrupted', 'Failed'] as const
export const sessionAgents = [...new Set(entitySessions.map(session => session.agent))].sort()
export const sessionRepositories = [...new Set(entitySessions.map(session => session.repository))].sort()
export type SessionFilters = { query: string; agent: string; status: string; employee: string; repository: string; device: string; minDuration: number; period: Period }
export const sessionsPageSize = 10
const sessionIdCollator = new Intl.Collator('en-US', { numeric: true })

export function parseSessionFilters(params: URLSearchParams): SessionFilters {
  const minimum = Number(params.get('minDuration'))
  const deepLinked = entitySessions.find(session => session.id === params.get('session'))
  const implicitPeriod = !params.has('period') && deepLinked && deepLinked.startedAt.slice(0, 10) < dailyActivity.at(-30)!.date ? 90 : parsePeriod(params.get('period'))
  return {
    query: params.get('q') ?? '', agent: params.get('agent') ?? '', status: params.get('status') ?? '',
    employee: params.get('employee') ?? '', repository: params.get('repository') ?? '', device: params.get('device') ?? '',
    minDuration: Number.isFinite(minimum) && minimum > 0 ? minimum : 0,
    period: implicitPeriod,
  }
}

export function filterSessions(filters: SessionFilters, ascending = false) {
  const start = dailyActivity.at(-filters.period)!.date
  const end = dailyActivity.at(-1)!.date
  const query = filters.query.trim().toLocaleLowerCase('en-US')
  return entitySessions.filter(session => {
    const date = session.startedAt.slice(0, 10)
    return date >= start && date <= end
      && (!query || [session.id, session.employee, session.agent, session.repository].some(value => value.toLocaleLowerCase('en-US').includes(query)))
      && (!filters.agent || session.agent === filters.agent)
      && (!filters.status || session.status === filters.status)
      && (!filters.employee || session.employeeId === filters.employee)
      && (!filters.repository || session.repository === filters.repository)
      && (!filters.device || session.deviceId === filters.device)
      && session.durationSeconds >= filters.minDuration
  }).sort((a, b) => (ascending ? 1 : -1) * sessionIdCollator.compare(a.id, b.id))
}

export function getSessionPage(sessions: EntitySession[], requestedPage: number) {
  const pageCount = Math.ceil(sessions.length / sessionsPageSize)
  const page = Math.max(1, Math.min(Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1, pageCount || 1))
  const start = (page - 1) * sessionsPageSize
  return { page, pageCount, rows: sessions.slice(start, start + sessionsPageSize), start: sessions.length ? start + 1 : 0, end: Math.min(start + sessionsPageSize, sessions.length) }
}

export function getPaginationItems(page: number, count: number): (number | 'ellipsis')[] {
  if (count < 1) return []
  const values = [...new Set([1, 2, 3, page - 1, page, page + 1, count])].filter(value => value >= 1 && value <= count).sort((a, b) => a - b)
  return values.flatMap((value, index) => index && value - values[index - 1] > 1 ? ['ellipsis' as const, value] : [value])
}

export type ToolCall = { id: string; name: 'file_read' | 'file_write'; timestamp: string; path: string; outcome: 'Succeeded' | 'Failed' }
export type TimelineEvent = { id: string; kind: 'start' | 'tool' | 'response' | 'end'; timestamp: string; title: string; summary: string; tool?: ToolCall['name'] }

export function getSessionInvestigation(session: EntitySession) {
  const start = Date.parse(session.startedAt)
  const duration = session.durationSeconds * 1000
  const at = (fraction: number) => new Date(start + Math.round(duration * fraction / 1000) * 1000).toISOString()
  const path = session.repository === 'billing-api' ? 'src/routes/invoices.ts' : session.repository === 'data-pipeline' ? 'src/jobs/transform.ts' : 'src/components/Header.tsx'
  const failed = session.status === 'Failed'
  const toolCalls: ToolCall[] = [
    { id: `${session.id}:read`, name: 'file_read', timestamp: at(0.05), path, outcome: 'Succeeded' },
    { id: `${session.id}:write`, name: 'file_write', timestamp: at(0.49), path, outcome: failed ? 'Failed' : 'Succeeded' },
  ]
  const timeline: TimelineEvent[] = [
    { id: 'start', kind: 'start', timestamp: session.startedAt, title: 'Session Started', summary: 'Session initialized' },
    ...toolCalls.map(call => ({ id: call.id, kind: 'tool' as const, timestamp: call.timestamp, title: 'Tool Call', tool: call.name, summary: `${call.name === 'file_read' ? 'Read file' : failed ? 'Update failed' : 'Updated file'}: ${call.path}` })),
    { id: 'response', kind: 'response', timestamp: at(0.75), title: 'Agent Response', summary: failed ? 'Reported a tool error; no successful update recorded.' : 'Applied the demo changes and summarized the result.' },
    { id: 'end', kind: 'end', timestamp: session.lastActivity, title: `Session ${session.status}`, summary: session.status === 'Completed' ? 'Session finished successfully' : failed ? 'Demo tool execution failed' : 'User stopped the demo session' },
  ]
  return {
    timeline, toolCalls,
    files: [{ path, actions: ['Read', failed ? 'Update failed' : 'Updated'] }],
    prompts: [
      { id: 'review', timestamp: at(0.02), summary: `Review the demo ${session.repository === 'data-pipeline' ? 'transformation task' : session.repository === 'billing-api' ? 'invoice validation route' : 'component layout'} for a scoped improvement.` },
      { id: 'apply', timestamp: at(0.3), summary: 'Apply the scoped demo change and summarize the result.' },
    ],
  }
}

export function formatSessionTime(timestamp: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(new Date(timestamp))
}
