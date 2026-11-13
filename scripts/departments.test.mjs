import test from 'node:test'
import assert from 'node:assert/strict'
import { getOverview } from '../src/data/companyOverview.ts'
import { employees } from '../src/data/entityAnalytics.ts'
import { departmentsCsv, getDepartments, getChartAxis, sortDepartments } from '../src/data/departments.ts'

test('department totals reconcile with the company and existing employee roster for every period', () => {
  for (const period of [7, 30, 90]) {
    const rows = getDepartments(period)
    const company = getOverview(period)
    assert.equal(rows.reduce((sum, row) => sum + row.sessions, 0), company.totalSessions)
    assert.equal(rows.reduce((sum, row) => sum + row.measuredTokens, 0), company.measuredTokens)
    assert.equal(rows.reduce((sum, row) => sum + row.costCents, 0), company.costCents)
    assert.equal(rows.reduce((sum, row) => sum + row.employees, 0), employees.length)
    assert.equal(new Set(rows.flatMap(row => row.members.map(member => member.id))).size, employees.length)
  }
  const rows = getDepartments(30)
  assert.equal(rows[0].sessions, 594)
  assert.equal(rows[0].measuredTokens, 5_870_000)
  assert.equal(rows[0].costCents, 22_610)
  assert.equal(rows[2].sessions, 690)
  assert.equal(rows[1].sessions, 0)
  assert.equal(rows[3].sessions, 0)
})

test('all columns sort in both directions without mutating the dataset; unavailable values sort last', () => {
  const rows = getDepartments(30)
  const original = JSON.stringify(rows)
  for (const key of ['name', 'employees', 'sessions', 'measuredTokens', 'costCents']) {
    for (const direction of ['asc', 'desc']) {
      const sorted = sortDepartments(rows, key, direction)
      for (let index = 1; index < sorted.length; index++) {
        const before = sorted[index - 1][key]
        const after = sorted[index][key]
        const comparison = typeof before === 'string' ? before.localeCompare(after) : before - after
        assert.ok(direction === 'asc' ? comparison <= 0 : comparison >= 0)
      }
    }
  }
  assert.equal(JSON.stringify(rows), original)
  const mixed = rows.map((row, index) => index === 0 ? { ...row, measuredTokens: null } : row)
  assert.equal(sortDepartments(mixed, 'measuredTokens', 'asc').at(-1).measuredTokens, null)
  assert.equal(sortDepartments(mixed, 'measuredTokens', 'desc').at(-1).measuredTokens, null)
})

test('zero activity, missing measurements and empty reports remain distinct', () => {
  const zero = getDepartments(30)[1]
  assert.equal(zero.sessions, 0)
  assert.equal(zero.measuredTokens, 0)
  assert.equal(zero.costCents, 0)
  const missing = getDepartments(30, 'unavailable')[0]
  assert.equal(missing.employees, 4)
  assert.equal(missing.sessions, null)
  assert.equal(missing.measuredTokens, null)
  assert.equal(missing.costCents, null)
  assert.deepEqual(getDepartments(30, 'empty'), [])
})

test('CSV preserves raw values, USD precision, displayed sort order, date scope and unavailable values', () => {
  const rows = sortDepartments(getDepartments(7), 'name', 'asc')
  const csv = departmentsCsv(rows, 7)
  assert.ok(csv.startsWith('\uFEFFDepartment,Employees,Sessions,Measured Tokens,Estimated Cost (USD)'))
  const lines = csv.trim().split('\r\n')
  assert.equal(lines.length, 5)
  assert.ok(lines[1].startsWith('Data,'))
  assert.ok(lines.every((line, index) => index === 0 || line.endsWith(',2026-11-06,2026-11-12,Prototype data')))
  const thirty = departmentsCsv(getDepartments(30), 30)
  assert.ok(thirty.includes('Engineering,4,594,5870000,226.10,'))
  assert.ok(departmentsCsv(getDepartments(30, 'unavailable'), 30).includes('Not Available'))
  assert.ok(departmentsCsv([{ ...rows[0], name: 'Data, "Insights"' }], 7).includes('"Data, ""Insights"""'))
})

test('chart axes cover both metric ranges and safely handle zero or missing values', () => {
  for (const metric of ['tokens', 'cost']) {
    const rows = getDepartments(30)
    const axis = getChartAxis(rows, metric)
    assert.ok(axis.max >= Math.max(...rows.map(row => metric === 'tokens' ? row.measuredTokens : row.costCents)))
    assert.equal(axis.ticks[0], 0)
    assert.equal(axis.ticks.at(-1), axis.max)
    assert.ok(Number.isFinite(getChartAxis(getDepartments(30, 'unavailable'), metric).max))
  }
})
