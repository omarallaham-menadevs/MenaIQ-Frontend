import test from 'node:test'
import assert from 'node:assert/strict'
import { entityFindings, entitySessions } from '../src/data/entityAnalytics.ts'
import { applySecurityAction, createSecurityFindings, filterSecurityFindings, parseSecurityFilters, securityPage } from '../src/data/securityFindings.ts'
const filters = query => parseSecurityFilters(new URLSearchParams(query))
test('security fixtures preserve reporting records and label candidate relationships honestly', () => {
  const rows = createSecurityFindings()
  assert.equal(rows.length, entityFindings.length)
  for (const row of rows) {
    const base = entityFindings.find(item => item.id === row.id)
    for (const key of Object.keys(base)) assert.equal(row[key], base[key])
    if (row.candidateSessionId) {
      const session = entitySessions.find(item => item.id === row.candidateSessionId)
      assert.equal(session.employeeId, row.employeeId)
      assert.equal(session.deviceId, row.deviceId)
      assert.equal(session.repository, row.repository)
      assert.ok(session.lastActivity <= row.detectedAt)
      assert.equal(row.relationship, 'Unverified candidate')
    }
    assert.equal(row.reviewStatus, 'Open')
    if (row.evidence.availability === 'Missing') assert.equal(row.evidence.excerpt, null)
  }
})
test('combined filters, periods and pagination partition the actual queue', () => {
  const rows = createSecurityFindings()
  assert.equal(filterSecurityFindings(rows, filters('severity=critical')).length, 3)
  assert.equal(filterSecurityFindings(rows, filters('period=7')).length, 8)
  assert.equal(filterSecurityFindings(rows, filters('employee=maya&severity=Critical&status=Open')).length, 1)
  assert.equal(filterSecurityFindings(rows, filters('q=no-such-finding')).length, 0)
  assert.equal(filterSecurityFindings(rows, filters('evidence=Missing')).length, 3)
  const pages = [1,2,3].flatMap(page => securityPage(rows, page).rows)
  assert.equal(new Set(pages.map(row => row.id)).size, rows.length)
  assert.equal(securityPage(rows, 100).rows.length, 2)
})
test('review, assignment and reopening are immutable local actions with an audit history', () => {
  const rows = createSecurityFindings()
  const at = '2026-11-13T10:00:00Z'
  let result = applySecurityAction(rows, rows[0].id, 'Administrator', { type: 'review', status: 'In Review', note: 'Sanitized demo review' }, at)
  assert.equal(result.changed, true)
  assert.equal(result.findings[0].activity.at(-1).note, 'Sanitized demo review')
  assert.equal(rows[0].reviewStatus, 'Open')
  result = applySecurityAction(result.findings, rows[0].id, 'Administrator', { type: 'assign', assigneeId: 'maya' }, at)
  assert.equal(result.findings[0].assigneeId, 'maya')
  for (const status of ['Resolved', 'Open']) {
    result = applySecurityAction(result.findings, rows[0].id, 'Administrator', { type: 'review', status, note: '' }, at)
    assert.equal(result.findings[0].reviewStatus, status)
  }
  assert.equal(result.findings[0].activity.length, 7)
  assert.equal(createSecurityFindings()[0].reviewStatus, 'Open')
})
test('Viewer cannot review or assign; invalid references cannot enter local state', () => {
  const rows = createSecurityFindings()
  for (const action of [{ type: 'review', status: 'Resolved', note: 'Denied' }, { type: 'assign', assigneeId: 'maya' }]) {
    const result = applySecurityAction(rows, rows[0].id, 'Viewer', action, '2026-11-13')
    assert.equal(result.changed, false)
    assert.equal(result.findings, rows)
  }
  assert.equal(applySecurityAction(rows, rows[0].id, 'Administrator', { type: 'assign', assigneeId: 'missing' }, '2026-11-13').changed, false)
})
