import { dailyActivity, parsePeriod, type Period } from './companyOverview.ts'
import { departments, type DepartmentId } from './departments.ts'
import { employees, entitySessions } from './entityAnalytics.ts'

export const usageModels = ['claude-sonnet-4', 'gpt-4o', 'claude-haiku-3.5', 'gpt-4o-mini'] as const
export type UsageModel = typeof usageModels[number]
export type UsageState = 'ready' | 'loading' | 'empty' | 'error' | 'unavailable'
export type UsageRequest = {
  id: string
  sessionId: string
  employeeId: string
  departmentId: DepartmentId
  model: UsageModel
  agent: string
  repository: string
  timestamp: string
  measuredTokens: number | null
  estimatedCostCents: number | null
  costBasis: 'Company key' | 'Personal key' | 'Not Available'
  status: 'Success' | 'Failed'
}
export type UsageFilters = { period: Period; employee: string; department: string; model: string; agent: string; repository: string; costAvailability: string; status: string }
export type UsageSortKey = 'model' | 'requests' | 'measuredTokens' | 'estimatedCostCents'
export type RequestSortKey = 'timestamp' | 'id' | 'employeeId' | 'model' | 'measuredTokens' | 'estimatedCostCents'

// Integer apportionment preserves each session's original totals exactly.
function apportion(total: number, weights: number[]) {
  const denominator = weights.reduce((sum, weight) => sum + weight, 0)
  let cumulative = 0
  let allocated = 0
  return weights.map(weight => {
    cumulative += weight
    const next = Math.round(total * cumulative / denominator)
    const portion = next - allocated
    allocated = next
    return portion
  })
}
function requestModel(sessionIndex: number, index: number): UsageModel {
  if (index === 0) return 'claude-sonnet-4'
  if (index === 1) return sessionIndex % 4 === 0 ? 'gpt-4o' : 'claude-sonnet-4'
  if (index === 2) return sessionIndex % 5 === 0 ? 'claude-haiku-3.5' : 'gpt-4o'
  if (index === 3) return sessionIndex % 5 < 3 ? 'gpt-4o-mini' : 'claude-haiku-3.5'
  return sessionIndex % 2 === 0 ? 'claude-sonnet-4' : 'gpt-4o'
}
const tokenWeights: Record<UsageModel, number> = { 'claude-sonnet-4': 50, 'gpt-4o': 28, 'claude-haiku-3.5': 13, 'gpt-4o-mini': 9 }
const costWeights: Record<UsageModel, number> = { 'claude-sonnet-4': 52, 'gpt-4o': 29, 'claude-haiku-3.5': 19, 'gpt-4o-mini': 0 }
let requestIndex = 0
export const usageRequests: UsageRequest[] = [...entitySessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).flatMap((session, sessionIndex) => {
  // Every contiguous 1,284 sessions produces exactly 5,382 distinct requests.
  const count = Math.round((sessionIndex + 1) * 5382 / 1284) - Math.round(sessionIndex * 5382 / 1284)
  const models = Array.from({ length: count }, (_, index) => requestModel(sessionIndex, index))
  const tokens = apportion(session.measuredTokens, models.map(model => tokenWeights[model]))
  // The existing session cost is a company-key subtotal. Allocate it ONLY to
  // company-key requests; unknown personal-key costs are null, never zero.
  const costs = apportion(session.costCents, models.map(model => costWeights[model]))
  const employee = employees.find(item => item.id === session.employeeId)!
  const department = departments.find(item => item.homeDepartment === employee.department)!
  return models.map((model, index) => ({
    id: `REQ-${String(++requestIndex).padStart(7, '0')}`, sessionId: session.id,
    employeeId: employee.id, departmentId: department.id, model, agent: session.agent, repository: session.repository,
    timestamp: new Date(Date.parse(session.startedAt) + Math.floor(session.durationSeconds * (index + 1) / (count + 1)) * 1000).toISOString(),
    measuredTokens: tokens[index], estimatedCostCents: model === 'gpt-4o-mini' ? null : costs[index],
    costBasis: model === 'gpt-4o-mini' ? 'Personal key' as const : 'Company key' as const,
    status: session.status === 'Failed' && index === count - 1 ? 'Failed' as const : 'Success' as const,
  }))
})

export function parseUsageFilters(params: URLSearchParams): UsageFilters {
  return { period: parsePeriod(params.get('period')), employee: params.get('employee') ?? '', department: params.get('department') ?? '', model: params.get('model') ?? '', agent: params.get('agent') ?? '', repository: params.get('repository') ?? '', costAvailability: params.get('costAvailability') ?? '', status: params.get('status') ?? '' }
}
export function parseUsageState(value: string | null): UsageState { return value === 'loading' || value === 'empty' || value === 'error' || value === 'unavailable' ? value : 'ready' }
export function filterUsageRequests(filters: UsageFilters, state: UsageState = 'ready') {
  if (state === 'empty') return []
  const start = dailyActivity.at(-filters.period)!.date
  const end = dailyActivity.at(-1)!.date
  const rows = usageRequests.filter(request => request.timestamp.slice(0, 10) >= start && request.timestamp.slice(0, 10) <= end
    && (!filters.employee || request.employeeId === filters.employee)
    && (!filters.department || request.departmentId === filters.department)
    && (!filters.model || request.model === filters.model)
    && (!filters.agent || request.agent === filters.agent)
    && (!filters.repository || request.repository === filters.repository)
    && (!filters.status || request.status === filters.status)
    && (!filters.costAvailability || (filters.costAvailability === 'available' ? request.estimatedCostCents !== null : request.estimatedCostCents === null)))
  return state === 'unavailable' ? rows.map(row => ({ ...row, measuredTokens: null, estimatedCostCents: null, costBasis: 'Not Available' as const })) : rows
}

function knownSum(values: (number | null)[]) {
  const known = values.filter((value): value is number => value !== null)
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null
}
export function summarizeUsage(rows: UsageRequest[]) {
  return {
    requests: rows.length,
    measuredTokens: knownSum(rows.map(row => row.measuredTokens)),
    estimatedCostCents: knownSum(rows.map(row => row.estimatedCostCents)),
    pricedRequests: rows.filter(row => row.estimatedCostCents !== null).length,
    unpricedRequests: rows.filter(row => row.estimatedCostCents === null).length,
    missingTokenRequests: rows.filter(row => row.measuredTokens === null).length,
  }
}

// Largest remainders give one decimal place and sum to exactly 100.0%.
function percentages(values: (number | null)[]): (number | null)[] {
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
  if (total === 0) return values.map(() => null)
  const exact = values.map(value => value === null ? 0 : value * 1000 / total)
  const units = exact.map(Math.floor)
  const order = exact.map((value, index) => ({ index, remainder: value - units[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  const missing = 1000 - units.reduce((sum, value) => sum + value, 0)
  for (let index = 0; index < missing; index++) units[order[index].index]++
  return values.map((value, index) => value === null ? null : units[index] / 10)
}
export function modelUsage(rows: UsageRequest[]) {
  const models = usageModels.map(model => ({ model, ...summarizeUsage(rows.filter(row => row.model === model)) })).filter(row => row.requests > 0)
  const requests = percentages(models.map(row => row.requests))
  const tokens = percentages(models.map(row => row.measuredTokens))
  const costs = percentages(models.map(row => row.estimatedCostCents))
  return models.map((row, index) => ({ ...row, requestPercent: requests[index], tokenPercent: tokens[index], costPercent: costs[index] }))
}
export type ModelUsage = ReturnType<typeof modelUsage>[number]
export function usageTrend(rows: UsageRequest[], period: Period) {
  const byDate = new Map<string, UsageRequest[]>()
  for (const row of rows) {
    const date = row.timestamp.slice(0, 10)
    const group = byDate.get(date) ?? []
    group.push(row)
    byDate.set(date, group)
  }
  return dailyActivity.slice(-period).map(day => {
    const matching = byDate.get(day.date) ?? []
    return { date: day.date, requests: matching.length, measuredTokens: matching.length ? knownSum(matching.map(row => row.measuredTokens)) : 0 }
  })
}
export function sortModelUsage(rows: ModelUsage[], key: UsageSortKey | null, descending: boolean) {
  if (!key) return [...rows]
  return [...rows].sort((a, b) => compare(a[key], b[key], descending) || a.model.localeCompare(b.model))
}
export function sortUsageRequests(rows: UsageRequest[], key: RequestSortKey, descending: boolean) {
  return [...rows].sort((a, b) => compare(a[key], b[key], descending) || a.id.localeCompare(b.id))
}
function compare(a: string | number | null, b: string | number | null, descending: boolean) {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return (descending ? -1 : 1) * (typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b))
}
export function parseModelSort(value: string | null): UsageSortKey | null { return value === 'model' || value === 'requests' || value === 'measuredTokens' || value === 'estimatedCostCents' ? value : null }
export function parseRequestSort(value: string | null): RequestSortKey { return value === 'id' || value === 'employeeId' || value === 'model' || value === 'measuredTokens' || value === 'estimatedCostCents' ? value : 'timestamp' }
export function formatPercent(value: number | null) { return value === null ? '—' : `${value.toFixed(1)}%` }
export function usageTokenLabel(value: number | null) { return value === null ? 'Not Available' : value >= 100_000 ? `${(value / 1_000_000).toFixed(2)}M` : value.toLocaleString('en-US') }
export function usageRequestPage(rows: UsageRequest[], requested: number) {
  const pageCount = Math.ceil(rows.length / 10)
  const page = Math.max(1, Math.min(Number.isFinite(requested) ? Math.floor(requested) : 1, pageCount || 1))
  const offset = (page - 1) * 10
  return { rows: rows.slice(offset, offset + 10), page, pageCount, start: rows.length ? offset + 1 : 0, end: Math.min(offset + 10, rows.length), total: rows.length }
}

function csv(records: (string | number)[][]) {
  return '\uFEFF' + records.map(record => record.map(value => { const text = String(value); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text }).join(',')).join('\r\n') + '\r\n'
}
export function modelUsageCsv(rows: ModelUsage[], period: Period, showPercent: boolean) {
  const start = dailyActivity.at(-period)!.date
  const end = dailyActivity.at(-1)!.date
  return csv([
    ['Model', 'Requests', ...(showPercent ? ['Requests % of Filtered Total'] : []), 'Measured Tokens', ...(showPercent ? ['Tokens % of Measured Total'] : []), 'Known Estimated Cost (USD)', ...(showPercent ? ['Cost % of Known Company-Key Subtotal'] : []), 'Priced Requests', 'Unpriced Requests', 'Period Start (UTC)', 'Period End (UTC)', 'Data Source'],
    ...rows.map(row => [row.model, row.requests, ...(showPercent ? [row.requestPercent ?? 'Not Available'] : []), row.measuredTokens ?? 'Not Available', ...(showPercent ? [row.tokenPercent ?? 'Not Available'] : []), row.estimatedCostCents === null ? 'Not Available' : (row.estimatedCostCents / 100).toFixed(2), ...(showPercent ? [row.costPercent ?? 'Not Available'] : []), row.pricedRequests, row.unpricedRequests, start, end, 'Prototype data; company-key estimates only, not billed cost']),
  ])
}
export function usageRequestsCsv(rows: UsageRequest[]) {
  return csv([
    ['Request ID', 'Session ID', 'Employee', 'Department', 'Model', 'Agent', 'Repository', 'Time (UTC)', 'Measured Tokens', 'Estimated Cost (USD)', 'Cost Basis', 'Status', 'Data Source'],
    ...rows.map(row => [row.id, row.sessionId, employees.find(employee => employee.id === row.employeeId)!.name, departments.find(department => department.id === row.departmentId)!.name, row.model, row.agent, row.repository, row.timestamp, row.measuredTokens ?? 'Not Available', row.estimatedCostCents === null ? 'Not Available' : (row.estimatedCostCents / 100).toFixed(2), row.costBasis, row.status, 'Prototype LiteLLM gateway records; not billed cost']),
  ])
}
