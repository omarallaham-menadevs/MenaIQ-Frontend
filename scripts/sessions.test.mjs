import test from 'node:test'
import assert from 'node:assert/strict'
import { getOverview, recentSessions } from '../src/data/companyOverview.ts'
import { entitySessions } from '../src/data/entityAnalytics.ts'
import { filterSessions, getPaginationItems, getSessionInvestigation, getSessionPage, parseSessionFilters } from '../src/data/sessions.ts'

const filters = query => parseSessionFilters(new URLSearchParams(query))

test('full session records, pagination and totals agree with Company Overview', () => {
  for (const period of [7, 30, 90]) {
    const rows = filterSessions(filters('period=' + period))
    assert.equal(rows.length, getOverview(period).totalSessions)
    const pages = Math.ceil(rows.length / 10)
    assert.equal(getSessionPage(rows, 1).rows.length, 10)
    assert.equal(getSessionPage(rows, pages).rows.length, rows.length % 10 || 10)
    assert.equal(getSessionPage(rows, 99999).page, pages)
    assert.equal(getSessionPage(rows, -1).page, 1)
  }
  assert.equal(getSessionPage(filterSessions(filters('')), 1).pageCount, 129)
  const empty = getSessionPage([], 999)
  assert.equal(empty.pageCount, 0)
  assert.equal(empty.start, 0)
  assert.equal(empty.end, 0)
  assert.deepEqual(getPaginationItems(1, 129), [1, 2, 3, 'ellipsis', 129])
})

test('search covers session ID, employee, agent and repository without case sensitivity', () => {
  for (const [query, field, expected] of [['ses-1082', 'id', 'SES-1082'], ['lina nasser', 'employee', 'Lina Nasser'], ['claude code', 'agent', 'Claude Code'], ['billing-api', 'repository', 'billing-api']]) {
    const rows = filterSessions(filters('q=' + encodeURIComponent(query)))
    assert.ok(rows.length > 0)
    assert.ok(rows.every(row => row[field] === expected))
  }
  assert.equal(filterSessions(filters('q=not-a-demo-session')).length, 0)
})

test('agent, all terminal statuses and advanced filters compose correctly', () => {
  const all = filterSessions(filters(''))
  for (const status of ['Completed', 'Interrupted', 'Failed']) {
    const rows = filterSessions(filters('status=' + status))
    assert.ok(rows.length > 0)
    assert.ok(rows.every(row => row.status === status))
  }
  assert.equal(['Completed', 'Interrupted', 'Failed'].reduce((sum, status) => sum + filterSessions(filters('status=' + status)).length, 0), all.length)
  const combined = filterSessions(filters('agent=Codex&employee=maya&repository=billing-api&device=DEV-001&minDuration=600'))
  assert.ok(combined.length > 0)
  assert.ok(combined.every(row => row.agent === 'Codex' && row.employeeId === 'maya' && row.repository === 'billing-api' && row.deviceId === 'DEV-001' && row.durationSeconds >= 600))
  assert.equal(filterSessions(filters('employee=noor')).length, 0)
})

test('shared known sessions keep their canonical employee, status and metadata', () => {
  for (const original of recentSessions) {
    const record = entitySessions.find(session => session.id === original.id)
    for (const key of Object.keys(original)) assert.equal(record[key], original[key])
  }
  assert.deepEqual(filterSessions(filters('')).slice(0, 6).map(session => session.id), ['SES-1084', 'SES-1083', 'SES-1082', 'SES-1081', 'SES-1080', 'SES-1079'])
})

test('investigation events, tool calls, files and sanitized prompts belong to the selected session', () => {
  for (const status of ['Completed', 'Interrupted', 'Failed']) {
    const session = entitySessions.find(record => record.status === status)
    const data = getSessionInvestigation(session)
    assert.equal(data.timeline[0].timestamp, session.startedAt)
    assert.equal(data.timeline.at(-1).timestamp, session.lastActivity)
    assert.equal(data.timeline.at(-1).title, 'Session ' + status)
    for (let index = 1; index < data.timeline.length; index++) assert.ok(Date.parse(data.timeline[index].timestamp) >= Date.parse(data.timeline[index - 1].timestamp))
    for (const call of data.toolCalls) {
      assert.ok(call.id.startsWith(session.id + ':'))
      assert.ok(data.timeline.some(event => event.id === call.id && event.tool === call.name && event.timestamp === call.timestamp))
      assert.ok(data.files.some(file => file.path === call.path))
    }
    assert.equal(data.toolCalls[1].outcome, status === 'Failed' ? 'Failed' : 'Succeeded')
    for (const prompt of data.prompts) {
      assert.ok(Date.parse(prompt.timestamp) >= Date.parse(session.startedAt))
      assert.ok(Date.parse(prompt.timestamp) <= Date.parse(session.lastActivity))
      assert.ok(!prompt.summary.includes(session.employee))
    }
  }
})

test('bare deep links expand to the shared 90-day scope when necessary; explicit periods remain respected', () => {
  const old = entitySessions.find(session => session.startedAt < '2026-10-14')
  assert.equal(filters('session=' + old.id).period, 90)
  assert.ok(filterSessions(filters('session=' + old.id)).some(session => session.id === old.id))
  assert.equal(filters('session=' + old.id + '&period=30').period, 30)
  assert.equal(filters('session=SES-1082').period, 30)
})
