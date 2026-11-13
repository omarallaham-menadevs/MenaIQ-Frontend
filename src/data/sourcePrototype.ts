import { coverageSnapshotAt, reportingSources, type ReportingSource, type SourceId } from './coverageHealth.ts'
import { applyIntegrationAction, createIntegrations, type Integration, type IntegrationAction, type IntegrationRole } from './integrations.ts'

export type SourcePrototype = { integrations: Integration[]; reporting: Partial<Record<SourceId, 'Healthy' | 'Delayed' | 'Degraded'>> }
export const sourceStorageKey = 'menaiq-source-prototype-v1'
export function createSourcePrototype(): SourcePrototype { return { integrations: createIntegrations(), reporting: {} } }
export function previewSourcePrototype(snapshot: SourcePrototype, params: URLSearchParams): SourcePrototype {
  const scenario = params.get('scenario')
  let next = snapshot
  if (params.get('state') === 'degraded') next = { ...next, reporting: { ...next.reporting, collectors: 'Degraded' } }
  if (scenario === 'github-healthy' || scenario === 'github-delayed' || scenario === 'litellm-degraded') {
    const id = scenario === 'litellm-degraded' ? 'litellm' : 'github'
    const health = scenario === 'github-healthy' ? 'Healthy' : scenario === 'github-delayed' ? 'Delayed' : 'Degraded'
    next = { integrations: snapshot.integrations.map(integration => integration.id === id ? { ...integration, configured: true, status: 'Connected' } : integration), reporting: { ...snapshot.reporting, [id]: health } }
  }
  const status = scenario === 'github-disconnected' || params.get('state') === 'disconnected' ? 'Disconnected' : scenario === 'github-not-configured' || params.get('state') === 'not-configured' ? 'Not Configured' : scenario === 'github-error' || params.get('state') === 'connection-error' ? 'Error' : null
  if (status) next = { ...next, integrations: next.integrations.map(integration => integration.id === 'github' ? { ...integration, status, configured: status !== 'Not Configured', repositories: status === 'Not Configured' ? [] : integration.repositories } : integration) }
  if (params.get('state') === 'unavailable' || scenario === 'litellm-disconnected') next = { ...next, integrations: next.integrations.map(integration => integration.id === 'litellm' ? { ...integration, status: 'Disconnected' } : integration) }
  return next
}
export function projectReportingSources(snapshot: SourcePrototype): ReportingSource[] {
  return reportingSources.map(base => {
    const integration = snapshot.integrations.find(integration => integration.id === base.id)!
    if (integration.status !== 'Connected') {
      const title = integration.status === 'Error' ? 'Demo connection error' : integration.status === 'Not Configured' ? 'Source is not configured' : 'Demo source is disconnected'
      return { ...base, configured: integration.configured, reportingAvailable: false, lastObservation: null, scope: 'Not Available for current reporting. Previous fixture scope is historical only.', events: [], issues: [{ id: `${base.id}-connection`, title, description: 'Current reporting is Not Available. Review the shared demo connection configuration; no real service was changed.', href: `/integrations?source=${base.id}`, linkLabel: 'View integration connection details' }] }
    }
    const health = snapshot.reporting[base.id]
    let source = { ...base }
    if (health === 'Healthy') source = { ...source, degraded: false, lastObservation: coverageSnapshotAt, issues: base.issues.filter(issue => !issue.id.endsWith('-delay')), events: [{ id: `${base.id}-healthy-scenario`, title: 'Healthy reporting observation (explicit demo scenario)', at: coverageSnapshotAt, status: 'Healthy' }, ...base.events] }
    if (health === 'Degraded') source = { ...source, degraded: true, issues: [{ id: `${base.id}-degraded-scenario`, title: 'Telemetry completeness is degraded', description: 'This demo scenario reports partial telemetry. Missing observations are Not Available, not zero.', href: base.id === 'litellm' ? '/usage-cost' : '/sessions', linkLabel: 'View affected demo records' }, ...base.issues] }
    if (base.id === 'github') source = { ...source, scope: `${integration.repositories.length} repositories in the current demo configuration. Period observations retain their historical fixture scope.`, limitation: `${base.limitation} Configuration changes are shared with Integrations within this browser session; historical observations are not rewritten.` }
    return source
  })
}
export function applySourceAction(snapshot: SourcePrototype, id: SourceId, role: IntegrationRole, action: IntegrationAction, at: string) {
  const result = applyIntegrationAction(snapshot.integrations,id,role,action,at)
  return { ...result, snapshot: result.ok ? { ...snapshot, integrations: result.integrations } : snapshot }
}
export function sourcePageHref(page: 'integrations' | 'coverage', id: SourceId, params: URLSearchParams) {
  const next = new URLSearchParams({ source: id })
  for (const key of ['role','scope','period','scenario']) { const value = params.get(key); if (value) next.set(key,value) }
  if (!next.has('scenario')) {
    const state = params.get('state')
    if (state === 'disconnected' || state === 'not-configured') next.set('scenario',`github-${state}`)
    if (state === 'connection-error') next.set('scenario','github-error')
    if (state === 'unavailable') next.set('scenario','litellm-disconnected')
  }
  return `${page === 'integrations' ? '/integrations' : '/coverage-health'}?${next}`
}
// Persist only non-secret, whitelisted setup enums and repository IDs, never credentials or free-form events.
export function serializeSourcePrototype(snapshot: SourcePrototype) { return JSON.stringify({ integrations: snapshot.integrations.map(({id,status,configured,repositories}) => ({id,status,configured,repositories})), reporting: snapshot.reporting }) }
export function restoreSourcePrototype(raw: string | null): SourcePrototype {
  const baseline = createSourcePrototype()
  if (!raw) return baseline
  try {
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved.integrations)) return baseline
    const allowedRepositories = createIntegrations().find(integration => integration.id === 'github')!.repositories
    return { integrations: baseline.integrations.map(integration => {
      const row = saved.integrations.find((row: { id?: unknown }) => row?.id === integration.id)
      if (!row || !['Connected','Disconnected','Error','Not Configured'].includes(row.status) || typeof row.configured !== 'boolean' || row.configured !== (row.status !== 'Not Configured') || !Array.isArray(row.repositories) || row.repositories.some((value: unknown) => typeof value !== 'string' || !allowedRepositories.includes(value)) || (integration.id !== 'github' && row.repositories.length) || new Set(row.repositories).size !== row.repositories.length) return integration
      return { ...integration, status: row.status, configured: row.configured, repositories: row.repositories }
    }), reporting: Object.fromEntries(Object.entries(saved.reporting ?? {}).filter(([id,health]) => baseline.integrations.some(integration => integration.id === id) && ['Healthy','Delayed','Degraded'].includes(String(health)))) }
  } catch { return baseline }
}
