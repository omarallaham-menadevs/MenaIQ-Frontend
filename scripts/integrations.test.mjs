import test from 'node:test'
import assert from 'node:assert/strict'
import { reportingSources, sourceHealth, sourceObservations } from '../src/data/coverageHealth.ts'
import { applyIntegrationAction, createIntegrations, integrationAttention, integrationPreview, validateDemoSetup } from '../src/data/integrations.ts'
import { projectReportingSources } from '../src/data/sourcePrototype.ts'
const at = '2026-11-13T12:00:00Z'
const setup = { workspace: 'prototype-workspace', outcome: 'success', repositories: ['web-platform'] }
test('integration fixtures derive setup and reporting from the existing Coverage snapshot', () => {
  const integrations = createIntegrations()
  assert.equal(integrations.length, reportingSources.length)
  for (const integration of integrations) {
    const source = reportingSources.find(source => source.id === integration.id)
    assert.equal(integration.configured, source.configured)
    assert.equal(integration.status, 'Connected')
    assert.equal(sourceHealth(projectReportingSources({ integrations, reporting: {} }).find(row => row.id === integration.id)), sourceHealth(source))
  }
  assert.equal(integrations.filter(integrationAttention).length, 0)
})
test('setup accepts only predefined non-secret demo values and existing repository scopes', () => {
  assert.equal(validateDemoSetup('github',setup),'')
  for (const invalid of [{ ...setup,workspace: 'UNAPPROVED_DEMO_INPUT' },{ ...setup,outcome: 'unknown' },{ ...setup,repositories: [] },{ ...setup,repositories: ['unknown-repo'] }]) {
    const integrations = createIntegrations()
    const result = applyIntegrationAction(integrations,'github','Administrator',{ type: 'configure',setup: invalid },at)
    assert.equal(result.ok,false)
    assert.equal(result.integrations,integrations)
    assert.ok(!JSON.stringify(result).includes('UNAPPROVED_DEMO_INPUT'))
  }
})
test('configure, disconnect and retry update local state without changing baseline telemetry', () => {
  const baseline = createIntegrations()
  const sourceBefore = JSON.stringify(reportingSources)
  let result = applyIntegrationAction(baseline,'github','Administrator',{ type: 'disconnect' },at)
  assert.equal(result.integrations[2].status,'Disconnected')
  assert.equal(sourceObservations(projectReportingSources({ integrations: result.integrations, reporting: {} })[2],30).count,null)
  assert.equal(applyIntegrationAction(result.integrations,'github','Administrator',{ type: 'check',outcome: 'success' },at).ok,false)
  result = applyIntegrationAction(result.integrations,'github','Administrator',{ type: 'configure',setup: { ...setup,outcome: 'error' } },at)
  assert.equal(result.integrations[2].status,'Error')
  result = applyIntegrationAction(result.integrations,'github','Administrator',{ type: 'check',outcome: 'success' },at)
  assert.equal(result.integrations[2].status,'Connected')
  assert.equal(sourceHealth(projectReportingSources({ integrations: result.integrations, reporting: {} })[2]),'Delayed')
  assert.equal(result.integrations[2].events.length,3)
  assert.equal(baseline[2].events.length,0)
  assert.equal(JSON.stringify(reportingSources),sourceBefore)
})
test('Viewer and Department Manager cannot configure, check or disconnect through direct actions', () => {
  for (const role of ['Viewer','Department Manager']) for (const action of [{ type: 'configure',setup },{ type: 'check',outcome: 'success' },{ type: 'disconnect' }]) {
    const integrations = createIntegrations()
    const result = applyIntegrationAction(integrations,'github',role,action,at)
    assert.equal(result.ok,false)
    assert.equal(result.integrations,integrations)
  }
  assert.equal(integrationPreview('not-configured')[2].status,'Not Configured')
  assert.equal(integrationPreview('disconnected')[2].status,'Disconnected')
  assert.equal(integrationPreview('connection-error')[2].status,'Error')
  assert.equal(integrationPreview('empty').length,0)
})
