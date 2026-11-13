import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyActivity, getOverview, parsePeriod, parsePreviewState } from '../src/data/companyOverview.ts'

test('30-day fixtures retain the approved summary values', () => {
  const overview = getOverview(30)
  assert.equal(overview.totalSessions, 1284)
  assert.equal(overview.measuredTokens, 8_420_000)
  assert.equal(overview.costCents, 31_840)
  assert.equal(overview.openFindings, 12)
  assert.equal(overview.criticalFindings, 3)
  assert.equal(overview.collectionIssues, 3)
  assert.equal(overview.days[0].date, '2026-10-14')
  assert.equal(overview.days.at(-1).date, '2026-11-12')
})

test('date ranges are continuous, nested and consistent with summary totals', () => {
  assert.equal(new Set(dailyActivity.map(day => day.date)).size, 90)
  for (const period of [7, 30, 90]) {
    const overview = getOverview(period)
    assert.equal(overview.days.length, period)
    assert.equal(overview.days.at(-1).date, '2026-11-12')
    for (const [index, day] of overview.days.entries()) {
      assert.ok(Number.isInteger(day.sessions) && day.sessions > 0)
      assert.ok(Number.isInteger(day.costCents) && day.costCents >= 0)
      assert.ok(Number.isInteger(day.measuredTokens) && day.measuredTokens >= 0)
      if (index) assert.equal(Date.parse(day.date) - Date.parse(overview.days[index - 1].date), 86_400_000)
    }
    assert.equal(overview.totalSessions, overview.days.reduce((sum, day) => sum + day.sessions, 0))
    assert.ok(overview.sessions.every(session => session.lastActivity.slice(0, 10) >= overview.days[0].date && session.lastActivity.slice(0, 10) <= '2026-11-12'))
  }
  assert.deepEqual(getOverview(90).days.slice(-30), getOverview(30).days)
  assert.deepEqual(getOverview(30).days.slice(-7), getOverview(7).days)
  assert.ok(getOverview(7).totalSessions < getOverview(30).totalSessions)
  assert.ok(getOverview(30).totalSessions < getOverview(90).totalSessions)
})

test('invalid URL parameters safely fall back to supported defaults', () => {
  for (const invalid of [null, '', 'abc', '-7', '365']) assert.equal(parsePeriod(invalid), 30)
  assert.equal(parsePeriod('7'), 7)
  assert.equal(parsePeriod('90'), 90)
  assert.equal(parsePreviewState('unexpected'), 'ready')
  for (const state of ['loading', 'empty', 'error']) assert.equal(parsePreviewState(state), state)
})
