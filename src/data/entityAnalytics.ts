import { dailyActivity, recentSessions, type Period, type Session } from './companyOverview.ts'

export type EntityType = 'employee' | 'device'
export const entityTabs = ['Overview', 'Sessions', 'Usage & Cost', 'Security'] as const
export type EntityTab = typeof entityTabs[number]

export type Employee = {
  id: string
  name: string
  role: string
  department: string
  email: string
  status: 'Active' | 'Inactive'
}

export type Device = {
  id: string
  name: string
  ownerId: string | null
  platform: string
  status: 'Active' | 'Not Available'
  telemetryAvailable: boolean
  gatewayMeasured: boolean
}

export const employees: Employee[] = [
  { id: 'maya', name: 'Maya Haddad', role: 'Software Engineer', department: 'Engineering', email: 'maya.haddad@menaiq.com', status: 'Active' },
  { id: 'omar', name: 'Omar Saleh', role: 'Backend Engineer', department: 'Engineering', email: 'omar.saleh@menaiq.com', status: 'Active' },
  { id: 'lina', name: 'Lina Nasser', role: 'Frontend Engineer', department: 'Engineering', email: 'lina.nasser@menaiq.com', status: 'Active' },
  { id: 'adam', name: 'Adam Khalil', role: 'Data Engineer', department: 'Data & Analytics', email: 'adam.khalil@menaiq.com', status: 'Active' },
  { id: 'noor', name: 'Noor Mansour', role: 'Software Engineer', department: 'Engineering', email: 'noor.mansour@menaiq.com', status: 'Active' },
]

export const devices: Device[] = [
  { id: 'DEV-001', name: 'ENG-MAYA-01', ownerId: 'maya', platform: 'macOS 15.6', status: 'Active', telemetryAvailable: true, gatewayMeasured: true },
  { id: 'DEV-002', name: 'ENG-OMAR-01', ownerId: 'omar', platform: 'Ubuntu 24.04', status: 'Active', telemetryAvailable: true, gatewayMeasured: false },
  { id: 'DEV-003', name: 'ENG-LINA-01', ownerId: 'lina', platform: 'Windows 11', status: 'Active', telemetryAvailable: true, gatewayMeasured: true },
  { id: 'DEV-004', name: 'DATA-ADAM-01', ownerId: 'adam', platform: 'Ubuntu 24.04', status: 'Active', telemetryAvailable: true, gatewayMeasured: true },
  { id: 'DEV-005', name: 'ENG-LEGACY-01', ownerId: null, platform: 'Not Available', status: 'Not Available', telemetryAvailable: false, gatewayMeasured: false },
]

export type EntitySession = Session & {
  employeeId: string
  deviceId: string
  startedAt: string
  durationSeconds: number
  measuredTokens: number
  costCents: number
}

type Totals = { sessions: number; measuredTokens: number; costCents: number }
const thirtyDayWeights = {
  sessions: [186, 240, 168, 690],
  measuredTokens: [2_410_000, 1_840_000, 1_620_000, 2_550_000],
  costCents: [9230, 7100, 6280, 9230],
} satisfies Record<keyof Totals, number[]>

// Cumulative apportionment partitions each company day exactly. Every 30-day
// employee total is exact, and the four employees reconcile to Company Overview.
function shareAt(total: number, weights: number[], index: number) {
  const sum = weights.reduce((value, weight) => value + weight, 0)
  const before = weights.slice(0, index).reduce((value, weight) => value + weight, 0)
  return Math.round(total * (before + weights[index]) / sum) - Math.round(total * before / sum)
}

const running: Totals = { sessions: 0, measuredTokens: 0, costCents: 0 }
const apportioned = dailyActivity.map(day => {
  const previous = { ...running }
  for (const key of Object.keys(running) as (keyof Totals)[]) running[key] += day[key]
  return employees.slice(0, 4).map((employee, index) => ({
    date: day.date,
    employee,
    sessions: shareAt(running.sessions, thirtyDayWeights.sessions, index) - shareAt(previous.sessions, thirtyDayWeights.sessions, index),
    measuredTokens: shareAt(running.measuredTokens, thirtyDayWeights.measuredTokens, index) - shareAt(previous.measuredTokens, thirtyDayWeights.measuredTokens, index),
    costCents: shareAt(running.costCents, thirtyDayWeights.costCents, index) - shareAt(previous.costCents, thirtyDayWeights.costCents, index),
  }))
}).flat()

function portion(total: number, count: number, index: number) {
  return Math.floor(total / count) + (index < total % count ? 1 : 0)
}

const knownSessions: Session[] = [
  ...recentSessions,
  // Distinct IDs fix the reference image's incorrect association of Omar and Lina with Maya.
  { id: 'SES-1080', employee: 'Maya Haddad', agent: 'Codex', repository: 'billing-api', status: 'Completed', lastActivity: '2026-11-12T13:18:00Z' },
  { id: 'SES-1079', employee: 'Maya Haddad', agent: 'Claude Code', repository: 'frontend-app', status: 'Interrupted', lastActivity: '2026-11-12T11:40:00Z' },
]
const durations: Record<string, number> = { 'SES-1084': 756, 'SES-1080': 1204, 'SES-1079': 499 }

export const entitySessions: EntitySession[] = apportioned.flatMap(day => {
  const employeeIndex = employees.findIndex(employee => employee.id === day.employee.id)
  const fixtures = knownSessions.filter(session => session.employee === day.employee.name && session.lastActivity.startsWith(day.date))
  return Array.from({ length: day.sessions }, (_, index) => {
    const fixture = fixtures[index]
    const durationSeconds = fixture ? durations[fixture.id] ?? 600 : 300 + (index % 12) * 47
    const lastActivity = fixture?.lastActivity ?? new Date(Date.parse(day.date + 'T08:00:00Z') + index * 120_000).toISOString()
    return {
      id: fixture?.id ?? `EA-${day.employee.id.toUpperCase()}-${day.date.replaceAll('-', '')}-${String(index + 1).padStart(2, '0')}`,
      employee: day.employee.name,
      employeeId: day.employee.id,
      deviceId: devices[employeeIndex].id,
      agent: fixture?.agent ?? (index % 2 === 0 ? 'Claude Code' : 'Codex'),
      repository: fixture?.repository ?? recentSessions[employeeIndex].repository,
      status: fixture?.status ?? (index % 19 === 18 ? 'Failed' : index % 11 === 10 ? 'Interrupted' : 'Completed'),
      lastActivity,
      startedAt: new Date(Date.parse(lastActivity) - durationSeconds * 1000).toISOString(),
      durationSeconds,
      measuredTokens: portion(day.measuredTokens, day.sessions, index),
      costCents: portion(day.costCents, day.sessions, index),
    }
  })
}).sort((a, b) => b.startedAt.localeCompare(a.startedAt))

export type Finding = {
  id: string
  employeeId: string
  deviceId: string
  severity: 'Critical' | 'High' | 'Medium'
  title: string
  detectedAt: string
}

export const entityFindings: Finding[] = employees.slice(0, 4).flatMap((employee, index) => {
  const count = [3, 3, 2, 4][index]
  return Array.from({ length: count }, (_, findingIndex) => ({
    id: `FND-${index + 1}${findingIndex + 1}`,
    employeeId: employee.id,
    deviceId: devices[index].id,
    severity: findingIndex === 0 && index !== 2 ? 'Critical' : findingIndex % 2 === 1 ? 'High' : 'Medium',
    title: ['Potential credential exposure', 'Sensitive content in AI context', 'Dependency requires review', 'Policy review required'][findingIndex],
    detectedAt: ['2026-11-12T10:00:00Z', '2026-11-06T09:00:00Z', '2026-10-27T15:00:00Z', '2026-10-20T12:00:00Z'][findingIndex],
  }))
})

export function getEntityAnalytics(type: EntityType, id: string | null, period: Period) {
  const employee = type === 'employee' ? employees.find(item => item.id === id) ?? employees[0] : null
  const device = type === 'device' ? devices.find(item => item.id === id) ?? devices[0] : null
  const entityId = employee?.id ?? device!.id
  const name = employee?.name ?? device!.name
  const startDate = dailyActivity.at(-period)!.date
  const endDate = dailyActivity.at(-1)!.date
  const available = device?.telemetryAvailable ?? true
  const measured = available && (device?.gatewayMeasured ?? true)
  const matchesEntity = (item: { employeeId: string; deviceId: string }) => employee ? item.employeeId === employee.id : item.deviceId === device!.id
  const sessions = entitySessions.filter(item => matchesEntity(item) && item.startedAt.slice(0, 10) >= startDate && item.startedAt.slice(0, 10) <= endDate)
  const findings = entityFindings.filter(item => matchesEntity(item) && item.detectedAt.slice(0, 10) >= startDate && item.detectedAt.slice(0, 10) <= endDate)
  return {
    employee, device, entityId, name, available, measured, sessions, findings,
    totalSessions: available ? sessions.length : null,
    measuredTokens: measured ? sessions.reduce((sum, session) => sum + session.measuredTokens, 0) : null,
    costCents: measured ? sessions.reduce((sum, session) => sum + session.costCents, 0) : null,
  }
}

export type EntityAnalytics = ReturnType<typeof getEntityAnalytics>

export function parseEntityTab(value: string | null): EntityTab {
  return entityTabs.find(tab => tab === value) ?? 'Overview'
}

export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

export function formatTokens(value: number | null) {
  if (value === null) return 'Not Available'
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)}M` : value.toLocaleString('en-US')
}

export function formatCost(value: number | null) {
  return value === null ? 'Not Available' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)
}
