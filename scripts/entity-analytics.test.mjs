import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyActivity, getOverview, recentSessions } from '../src/data/companyOverview.ts'
import { devices, employees, entityFindings, entitySessions, getEntityAnalytics, parseEntityTab } from '../src/data/entityAnalytics.ts'

test('Maya matches the approved totals and has three correctly associated recent sessions', () => {
  const data = getEntityAnalytics('employee', 'maya', 30)
  assert.equal(data.totalSessions, 186)
  assert.equal(data.measuredTokens, 2_410_000)
  assert.equal(data.costCents, 9230)
  assert.deepEqual(data.sessions.slice(0, 3).map(session => session.id), ['SES-1084', 'SES-1080', 'SES-1079'])
  assert.ok(data.sessions.every(session => session.employee === 'Maya Haddad'))
  assert.ok(!data.sessions.some(session => session.id === 'SES-1083' || session.id === 'SES-1082'))
})

test('entity aggregates reconcile to Company Overview for every supported period', () => {
  for (const period of [7, 30, 90]) {
    const company = getOverview(period)
    const entities = employees.map(employee => getEntityAnalytics('employee', employee.id, period))
    assert.equal(entities.reduce((sum, entity) => sum + entity.totalSessions, 0), company.totalSessions)
    assert.equal(entities.reduce((sum, entity) => sum + entity.measuredTokens, 0), company.measuredTokens)
    assert.equal(entities.reduce((sum, entity) => sum + entity.costCents, 0), company.costCents)
  }
  for (const day of dailyActivity) {
    const sessions = entitySessions.filter(session => session.startedAt.startsWith(day.date))
    assert.equal(sessions.length, day.sessions)
    assert.equal(sessions.reduce((sum, session) => sum + session.measuredTokens, 0), day.measuredTokens)
    assert.equal(sessions.reduce((sum, session) => sum + session.costCents, 0), day.costCents)
  }
})

test('shared session IDs retain their original owners and metadata', () => {
  assert.equal(new Set(entitySessions.map(session => session.id)).size, entitySessions.length)
  for (const original of recentSessions) {
    const session = entitySessions.find(item => item.id === original.id)
    for (const key of Object.keys(original)) assert.equal(session[key], original[key])
  }
  for (const session of entitySessions) {
    assert.equal(employees.find(employee => employee.id === session.employeeId).name, session.employee)
    assert.equal(devices.find(device => device.id === session.deviceId).ownerId, session.employeeId)
    assert.equal(Date.parse(session.lastActivity) - Date.parse(session.startedAt), session.durationSeconds * 1000)
    assert.ok(session.measuredTokens >= 0 && Number.isInteger(session.measuredTokens))
    assert.ok(session.costCents >= 0 && Number.isInteger(session.costCents))
  }
})

test('devices, unmeasured devices, no-activity employees and unavailable telemetry are distinct', () => {
  const employee = getEntityAnalytics('employee', 'maya', 30)
  const device = getEntityAnalytics('device', 'DEV-001', 30)
  assert.deepEqual(device.sessions, employee.sessions)
  const unmeasured = getEntityAnalytics('device', 'DEV-002', 30)
  assert.ok(unmeasured.totalSessions > 0)
  assert.equal(unmeasured.measuredTokens, null)
  assert.equal(unmeasured.costCents, null)
  const missing = getEntityAnalytics('device', 'DEV-005', 30)
  assert.equal(missing.available, false)
  assert.equal(missing.totalSessions, null)
  const empty = getEntityAnalytics('employee', 'noor', 30)
  assert.equal(empty.available, true)
  assert.equal(empty.totalSessions, 0)
  assert.equal(empty.measuredTokens, 0)
  assert.equal(empty.costCents, 0)
  assert.equal(entityFindings.length, 12)
  assert.equal(entityFindings.filter(finding => finding.severity === 'Critical').length, 3)
})

test('period and entity changes return consistent subsets and safe defaults', () => {
  const seven = getEntityAnalytics('employee', 'maya', 7)
  const thirty = getEntityAnalytics('employee', 'maya', 30)
  const ninety = getEntityAnalytics('employee', 'maya', 90)
  assert.ok(seven.totalSessions < thirty.totalSessions && thirty.totalSessions < ninety.totalSessions)
  assert.ok(seven.sessions.every(session => thirty.sessions.some(other => other.id === session.id)))
  assert.ok(seven.findings.length < thirty.findings.length)
  assert.equal(getEntityAnalytics('employee', 'unknown', 30).entityId, 'maya')
  assert.equal(getEntityAnalytics('device', 'unknown', 30).entityId, 'DEV-001')
  assert.equal(parseEntityTab('unknown'), 'Overview')
})
