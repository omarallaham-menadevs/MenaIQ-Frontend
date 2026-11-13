import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyActivity, getOverview } from '../src/data/companyOverview.ts'
import { employees, entitySessions, getEntityAnalytics } from '../src/data/entityAnalytics.ts'
import { departments } from '../src/data/departments.ts'
import { filterUsageRequests, modelUsage, modelUsageCsv, parseUsageFilters, sortModelUsage, sortUsageRequests, summarizeUsage, usageRequestPage, usageRequests, usageRequestsCsv, usageTrend } from '../src/data/usageAndCost.ts'

const filters = query => parseUsageFilters(new URLSearchParams(query))
const sum = values => values.reduce((total, value) => total + value, 0)

test('request records partition session measurements and company-key costs without duplicates', () => {
  assert.equal(new Set(usageRequests.map(request => request.id)).size, usageRequests.length)
  const grouped = Map.groupBy(usageRequests, request => request.sessionId)
  for (const session of entitySessions) {
    const records = grouped.get(session.id)
    assert.ok(records.length >= 4)
    assert.equal(sum(records.map(record => record.measuredTokens)), session.measuredTokens)
    assert.equal(sum(records.filter(record => record.estimatedCostCents !== null).map(record => record.estimatedCostCents)), session.costCents)
    for (const record of records) {
      assert.equal(record.employeeId, session.employeeId)
      const employee = employees.find(item => item.id === record.employeeId)
      assert.equal(departments.find(item => item.id === record.departmentId).homeDepartment, employee.department)
      assert.equal(record.repository, session.repository)
      assert.equal(record.agent, session.agent)
      assert.ok(Date.parse(record.timestamp) >= Date.parse(session.startedAt) && Date.parse(record.timestamp) <= Date.parse(session.lastActivity))
      assert.ok(Number.isInteger(record.measuredTokens) && record.measuredTokens >= 0)
      if (record.costBasis !== 'Company key') assert.equal(record.estimatedCostCents, null)
    }
  }
})

test('summary, daily chart and model breakdowns reconcile within every reporting period', () => {
  for (const period of [7, 30, 90]) {
    const rows = filterUsageRequests(filters('period=' + period))
    const summary = summarizeUsage(rows)
    const company = getOverview(period)
    const models = modelUsage(rows)
    const trend = usageTrend(rows, period)
    assert.equal(summary.measuredTokens, company.measuredTokens)
    assert.equal(summary.estimatedCostCents, company.costCents)
    assert.equal(sum(models.map(model => model.requests)), summary.requests)
    assert.equal(sum(models.map(model => model.measuredTokens)), summary.measuredTokens)
    assert.equal(sum(models.map(model => model.estimatedCostCents ?? 0)), summary.estimatedCostCents)
    assert.equal(sum(trend.map(day => day.measuredTokens)), summary.measuredTokens)
    for (const day of trend) assert.equal(day.measuredTokens, dailyActivity.find(item => item.date === day.date).measuredTokens)
    for (const key of ['requestPercent', 'tokenPercent', 'costPercent']) assert.ok(Math.abs(sum(models.filter(model => model[key] !== null).map(model => model[key])) - 100) < 1e-9)
  }
  const summary = summarizeUsage(filterUsageRequests(filters('')))
  assert.equal(summary.requests, 5382)
  assert.equal(summary.measuredTokens, 8_420_000)
  assert.equal(summary.estimatedCostCents, 31_840)
  assert.ok(summary.unpricedRequests > 0)
})

test('employee, department, model and advanced filters compose across the same records', () => {
  const rows = filterUsageRequests(filters('employee=maya&department=engineering&model=claude-sonnet-4&agent=Claude+Code&repository=web-platform&costAvailability=available&status=Success'))
  assert.ok(rows.length > 0)
  assert.ok(rows.every(row => row.employeeId === 'maya' && row.departmentId === 'engineering' && row.model === 'claude-sonnet-4' && row.agent === 'Claude Code' && row.repository === 'web-platform' && row.estimatedCostCents !== null && row.status === 'Success'))
  const maya = summarizeUsage(filterUsageRequests(filters('employee=maya')))
  const entity = getEntityAnalytics('employee', 'maya', 30)
  assert.equal(maya.measuredTokens, entity.measuredTokens)
  assert.equal(maya.estimatedCostCents, entity.costCents)
  assert.equal(filterUsageRequests(filters('employee=noor')).length, 0)
  assert.equal(filterUsageRequests(filters('department=product')).length, 0)
  assert.equal(modelUsage(filterUsageRequests(filters('model=gpt-4o')))[0].requestPercent, 100)
})

test('unavailable costs and missing metrics are never substituted with zero', () => {
  const mini = filterUsageRequests(filters('model=gpt-4o-mini'))
  assert.ok(mini.length > 0)
  assert.ok(mini.every(row => row.measuredTokens > 0 && row.estimatedCostCents === null && row.costBasis === 'Personal key'))
  assert.equal(summarizeUsage(mini).estimatedCostCents, null)
  assert.equal(modelUsage(mini)[0].costPercent, null)
  const missing = filterUsageRequests(filters(''), 'unavailable')
  assert.equal(summarizeUsage(missing).requests, 5382)
  assert.equal(summarizeUsage(missing).measuredTokens, null)
  assert.equal(summarizeUsage(missing).estimatedCostCents, null)
  assert.ok(usageTrend(missing, 30).every(day => day.measuredTokens === null))
  assert.deepEqual(filterUsageRequests(filters(''), 'empty'), [])
})

test('sorting preserves null values last and pagination uses actual filtered request counts', () => {
  const rows = filterUsageRequests(filters(''))
  const models = modelUsage(rows)
  for (const descending of [false, true]) {
    assert.equal(sortModelUsage(models, 'estimatedCostCents', descending).at(-1).model, 'gpt-4o-mini')
    assert.equal(sortUsageRequests(rows, 'estimatedCostCents', descending).at(-1).estimatedCostCents, null)
  }
  assert.equal(usageRequestPage(rows, 1).rows.length, 10)
  assert.equal(usageRequestPage(rows, 9999).pageCount, 539)
  assert.equal(usageRequestPage(rows, 539).rows.length, 2)
  assert.equal(usageRequestPage([], 1).pageCount, 0)
})

test('CSV exports raw filtered values, appropriate percentages and unavailable costs', () => {
  const rows = filterUsageRequests(filters('model=gpt-4o-mini'))
  const models = modelUsage(rows)
  const withPercent = modelUsageCsv(models, 30, true)
  assert.ok(withPercent.includes('Requests % of Filtered Total'))
  assert.ok(withPercent.includes('Not Available'))
  assert.ok(withPercent.includes(',100,'))
  assert.ok(!modelUsageCsv(models, 30, false).includes('% of'))
  const requests = usageRequestsCsv(rows)
  assert.equal(requests.trim().split('\r\n').length, rows.length + 1)
  assert.ok(requests.includes(',Personal key,'))
  assert.ok(requests.includes('Prototype LiteLLM gateway records; not billed cost'))
})
