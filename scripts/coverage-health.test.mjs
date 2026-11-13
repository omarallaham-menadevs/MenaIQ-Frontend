import test from 'node:test'
import assert from 'node:assert/strict'
import { getOverview } from '../src/data/companyOverview.ts'
import { devices } from '../src/data/entityAnalytics.ts'
import { filterUsageRequests, parseUsageFilters, summarizeUsage } from '../src/data/usageAndCost.ts'
import { coverageSnapshotAt, coverageSources, filterCoverageSources, observationAge, parseCoverageFilters, reportingSources, sourceEvents, sourceHealth, sourceObservations } from '../src/data/coverageHealth.ts'

const filters = value => parseCoverageFilters(new URLSearchParams(value))
test('source snapshots reconcile with Company Overview warnings and existing device scope', () => {
  assert.equal(reportingSources.length, 3)
  assert.equal(reportingSources.flatMap(source => source.issues).length, getOverview(30).collectionIssues)
  assert.equal(sourceHealth(reportingSources.find(source => source.id === 'litellm')), 'Delayed')
  assert.equal(sourceHealth(reportingSources.find(source => source.id === 'collectors')), 'Healthy')
  assert.ok(reportingSources[0].scope.includes(`${devices.filter(device => device.telemetryAvailable).length} of ${devices.length}`))
  for (const source of reportingSources) {
    assert.ok(source.lastObservation <= coverageSnapshotAt)
    assert.ok(source.events.every(event => event.at <= coverageSnapshotAt))
    assert.ok(source.issues.every(issue => issue.href.startsWith('/') && !issue.href.startsWith('//')))
  }
})
test('period observations reconcile with approved page totals without claiming completeness', () => {
  for (const period of [7, 30, 90]) {
    const gateway = sourceObservations(reportingSources[1], period)
    const usage = summarizeUsage(filterUsageRequests(parseUsageFilters(new URLSearchParams('period=' + period))))
    assert.equal(gateway.count, usage.requests)
    assert.equal(gateway.measuredTokens, getOverview(period).measuredTokens)
    assert.equal(sourceObservations(reportingSources[0], period).count, getOverview(period).totalSessions)
    assert.equal(sourceObservations(reportingSources[0], period).measuredTokens, null)
    assert.equal(sourceObservations(reportingSources[2], period).measuredTokens, null)
    assert.equal(sourceEvents(reportingSources[0], period).length, period)
    assert.equal(sourceEvents(reportingSources[1], period).length, period + 1)
  }
})
test('source search and health/issue filters compose; no-match results remain empty', () => {
  assert.equal(filterCoverageSources(reportingSources, filters('q=ENG-LEGACY-01')).at(0).id, 'collectors')
  assert.deepEqual(filterCoverageSources(reportingSources, filters('health=delayed')).map(source => source.id), ['litellm', 'github'])
  assert.equal(filterCoverageSources(reportingSources, filters('health=Healthy&q=github')).length, 0)
  assert.equal(filterCoverageSources(reportingSources, filters('filter=issues')).length, 3)
  assert.equal(filterCoverageSources(reportingSources, filters('q=does-not-exist')).length, 0)
})
test('unavailable, disconnected, not-configured and degraded previews do not invent zero measurements', () => {
  const disconnected = coverageSources('unavailable').find(source => source.id === 'litellm')
  assert.equal(sourceHealth(disconnected), 'Disconnected')
  assert.deepEqual(sourceObservations(disconnected, 30), { count: null, measuredTokens: null, label: 'requests' })
  assert.equal(sourceEvents(disconnected, 30).length, 0)
  assert.equal(observationAge(disconnected.lastObservation), 'Not Available')
  const unconfigured = coverageSources('not-configured').find(source => source.id === 'github')
  assert.equal(sourceHealth(unconfigured), 'Not Configured')
  assert.equal(sourceObservations(unconfigured, 30).count, null)
  assert.equal(sourceHealth(coverageSources('degraded')[0]), 'Degraded')
  assert.equal(coverageSources('empty').length, 0)
  assert.equal(sourceHealth(reportingSources[1]), 'Delayed', 'previews must not mutate approved snapshots')
})
