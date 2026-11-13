import test from 'node:test'
import assert from 'node:assert/strict'
import { reportingSources, sourceHealth, sourceObservations } from '../src/data/coverageHealth.ts'
import { applySourceAction, createSourcePrototype, previewSourcePrototype, projectReportingSources, restoreSourcePrototype, serializeSourcePrototype, sourcePageHref } from '../src/data/sourcePrototype.ts'
const scenario = name => previewSourcePrototype(createSourcePrototype(),new URLSearchParams('scenario=' + name))
test('connected setup is independent from healthy, delayed, and degraded reporting', () => {
  for (const [name,id,health] of [['github-healthy','github','Healthy'],['github-delayed','github','Delayed'],['litellm-degraded','litellm','Degraded']]) {
    const snapshot = scenario(name)
    assert.equal(snapshot.integrations.find(integration => integration.id === id).status,'Connected')
    assert.equal(sourceHealth(projectReportingSources(snapshot).find(source => source.id === id)),health)
  }
})
test('disconnected/not-configured/error configuration consistently suppresses current observations', () => {
  for (const [name,expected] of [['github-disconnected','Disconnected'],['github-not-configured','Not Configured'],['github-error','Disconnected']]) {
    const source = projectReportingSources(scenario(name)).find(source => source.id === 'github')
    assert.equal(sourceHealth(source),expected)
    assert.equal(source.lastObservation,null)
    assert.equal(sourceObservations(source,30).count,null)
    assert.equal(sourceObservations(source,30).measuredTokens,null)
    assert.deepEqual(source.events,[])
  }
})
test('shared mutations retain reporting delay, persist safe configuration and preserve baseline fixtures', () => {
  const baseline = JSON.stringify(reportingSources)
  let snapshot = createSourcePrototype()
  let result = applySourceAction(snapshot,'github','Administrator',{ type: 'disconnect' },'2026-11-13T10:00:00Z')
  assert.equal(result.ok,true)
  snapshot = restoreSourcePrototype(serializeSourcePrototype(result.snapshot))
  assert.equal(snapshot.integrations[2].status,'Disconnected')
  assert.equal(sourceHealth(projectReportingSources(snapshot)[2]),'Disconnected')
  result = applySourceAction(snapshot,'github','Administrator',{ type: 'configure',setup: { workspace: 'prototype-workspace',outcome: 'success',repositories: ['web-platform'] } },'2026-11-13T10:01:00Z')
  assert.equal(result.ok,true)
  assert.equal(sourceHealth(projectReportingSources(result.snapshot)[2]),'Delayed')
  assert.equal(projectReportingSources(result.snapshot)[2].scope.startsWith('1 repositories'),true)
  assert.equal(JSON.stringify(reportingSources),baseline)
})
test('roles cannot mutate shared configuration and navigation retains role/scope/source without unrelated filters', () => {
  const snapshot = createSourcePrototype()
  for (const role of ['Viewer','Department Manager']) {
    const result = applySourceAction(snapshot,'github',role,{ type: 'disconnect' },'2026-11-13')
    assert.equal(result.ok,false)
    assert.equal(result.snapshot,snapshot)
  }
  const params = new URLSearchParams('role=viewer&scope=data&period=7&scenario=github-delayed&filter=issues&state=error')
  const link = sourcePageHref('coverage','github',params)
  assert.equal(link,'/coverage-health?source=github&role=viewer&scope=data&period=7&scenario=github-delayed')
  assert.equal(sourcePageHref('integrations','litellm',new URLSearchParams()),'/integrations?source=litellm')
})
test('corrupted persisted data cannot inject credentials, events, unknown IDs or unsupported scopes', () => {
  for (const raw of ['not-json','null','{}']) assert.deepEqual(restoreSourcePrototype(raw),createSourcePrototype())
  const data = JSON.parse(serializeSourcePrototype(createSourcePrototype()))
  data.integrations[2].repositories = ['unlisted-repository']
  data.integrations[2].secret = 'UNAPPROVED_DEMO_VALUE'
  data.integrations[2].events = [{ title: 'UNAPPROVED_DEMO_VALUE' }]
  data.reporting = { github: 'Unknown', attacker: 'Healthy' }
  const restored = restoreSourcePrototype(JSON.stringify(data))
  assert.equal(JSON.stringify(restored).includes('UNAPPROVED_DEMO_VALUE'),false)
  assert.deepEqual(restored.reporting,{})
})
