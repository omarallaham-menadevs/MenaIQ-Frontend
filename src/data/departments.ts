import { dailyActivity, type Period } from './companyOverview.ts'
import { employees, getEntityAnalytics, type Employee } from './entityAnalytics.ts'

export const departments = [
  { id: 'engineering', name: 'Engineering', initials: 'EN', homeDepartment: 'Engineering', avatarClass: 'bg-success-soft text-success' },
  { id: 'product', name: 'Product', initials: 'PR', homeDepartment: 'Product', avatarClass: 'bg-sky-100 text-blue-800' },
  { id: 'data', name: 'Data', initials: 'DA', homeDepartment: 'Data & Analytics', avatarClass: 'bg-amber-100 text-amber-700' },
  { id: 'marketing', name: 'Marketing', initials: 'MK', homeDepartment: 'Marketing', avatarClass: 'bg-violet-100 text-indigo-800' },
] as const

export type DepartmentId = typeof departments[number]['id']
export type DepartmentMetric = 'tokens' | 'cost'
export type DepartmentState = 'ready' | 'loading' | 'empty' | 'error' | 'unavailable'
export type SortKey = 'name' | 'employees' | 'sessions' | 'measuredTokens' | 'costCents'
export type SortDirection = 'asc' | 'desc'
export type DepartmentRow = {
  id: DepartmentId
  name: string
  initials: string
  avatarClass: string
  employees: number
  sessions: number | null
  measuredTokens: number | null
  costCents: number | null
  members: Employee[]
}

export function getDepartments(period: Period, state: DepartmentState = 'ready'): DepartmentRow[] {
  if (state === 'empty') return []
  return departments.map(department => {
    const members = employees.filter(employee => employee.department === department.homeDepartment)
    const activity = members.map(employee => getEntityAnalytics('employee', employee.id, period))
    return {
      id: department.id,
      name: department.name,
      initials: department.initials,
      avatarClass: department.avatarClass,
      members,
      employees: members.length,
      sessions: state === 'unavailable' ? null : activity.reduce((sum, item) => sum + (item.totalSessions ?? 0), 0),
      measuredTokens: state === 'unavailable' ? null : activity.reduce((sum, item) => sum + (item.measuredTokens ?? 0), 0),
      costCents: state === 'unavailable' ? null : activity.reduce((sum, item) => sum + (item.costCents ?? 0), 0),
    }
  })
}

export function sortDepartments(rows: DepartmentRow[], key: SortKey | null, direction: SortDirection): DepartmentRow[] {
  if (!key) return [...rows]
  return [...rows].sort((left, right) => {
    const a = left[key]
    const b = right[key]
    // Missing values always sort last; do not treat missing measurements as zero.
    if (a === null && b === null) return left.name.localeCompare(right.name)
    if (a === null) return 1
    if (b === null) return -1
    const comparison = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b)
    return (direction === 'asc' ? comparison : -comparison) || left.name.localeCompare(right.name)
  })
}

export function parseDepartmentState(value: string | null): DepartmentState {
  return value === 'loading' || value === 'empty' || value === 'error' || value === 'unavailable' ? value : 'ready'
}

export function parseSortKey(value: string | null): SortKey | null {
  return value === 'name' || value === 'employees' || value === 'sessions' || value === 'measuredTokens' || value === 'costCents' ? value : null
}

export function getChartAxis(rows: DepartmentRow[], metric: DepartmentMetric) {
  const max = Math.max(0, ...rows.map(row => (metric === 'tokens' ? row.measuredTokens : row.costCents) ?? 0))
  if (max === 0) return { max: 1, ticks: [0, 1] }
  const rawStep = max / 7
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = ([1, 2, 2.5, 5, 10].find(value => value * magnitude >= rawStep) ?? 10) * magnitude
  const count = Math.ceil(max / step)
  return { max: count * step, ticks: Array.from({ length: count + 1 }, (_, index) => index * step) }
}

export function formatAxisValue(value: number, metric: DepartmentMetric) {
  if (metric === 'cost') return `$${(value / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  if (value === 0) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`
  return value >= 1000 ? `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K` : String(value)
}

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function departmentsCsv(rows: DepartmentRow[], period: Period) {
  const start = dailyActivity.at(-period)!.date
  const end = dailyActivity.at(-1)!.date
  const records: (string | number)[][] = [
    ['Department', 'Employees', 'Sessions', 'Measured Tokens', 'Estimated Cost (USD)', 'Measurement Status', 'Period Start (UTC)', 'Period End (UTC)', 'Data Source'],
    ...rows.map(row => [row.name, row.employees, row.sessions ?? 'Not Available', row.measuredTokens ?? 'Not Available', row.costCents === null ? 'Not Available' : (row.costCents / 100).toFixed(2), row.measuredTokens === null ? 'Not Available' : 'LiteLLM gateway measurements', start, end, 'Prototype data']),
  ]
  return '\uFEFF' + records.map(record => record.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
