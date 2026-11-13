import { reportingSources, type SourceId } from './coverageHealth.ts'
import { traceRepositories } from './traceability.ts'

export type ConnectionState = 'Connected' | 'Disconnected' | 'Error' | 'Not Configured'
export type Integration = { id: SourceId; name: string; description: string; purpose: string; status: ConnectionState; repositories: string[]; configured: boolean; events: { id: string; title: string; at: string; result: string }[] }
export type IntegrationRole = 'Administrator' | 'Department Manager' | 'Viewer'
export type DemoSetup = { workspace: string; outcome: string; repositories: string[] }
export type IntegrationAction = { type: 'configure'; setup: DemoSetup } | { type: 'disconnect' } | { type: 'check'; outcome: 'success' | 'error' }
export const integrationTabs = ['Overview', 'Repositories', 'Connection Events'] as const
export type IntegrationTab = typeof integrationTabs[number]
export function integrationRole(params: URLSearchParams): IntegrationRole { return params.get('role') === 'viewer' ? 'Viewer' : params.get('role') === 'manager' ? 'Department Manager' : 'Administrator' }
export function createIntegrations(): Integration[] {
  return reportingSources.map(source => ({ id: source.id, name: source.id === 'collectors' ? 'Local Collector' : source.id === 'github' ? 'GitHub App' : source.name, description: source.id === 'collectors' ? 'Captures supported coding-agent sessions' : source.id === 'github' ? 'Commits, pull requests and reviews' : 'Model requests, measured tokens and cost', purpose: source.id === 'collectors' ? 'Device enrollment & reporting' : source.id === 'github' ? 'Repository and code traceability' : 'Managed API gateway', status: source.configured && source.reportingAvailable ? 'Connected' : source.configured ? 'Disconnected' : 'Not Configured', configured: source.configured, repositories: source.id === 'github' ? traceRepositories.map(repository => repository.name) : [], events: [] }))
}
export function integrationSource(id: SourceId) { return reportingSources.find(source => source.id === id)! }
export function integrationAttention(integration: Integration) { return integration.status !== 'Connected' }
export function validateDemoSetup(id: SourceId, setup: DemoSetup) {
  if (setup.workspace !== 'prototype-workspace') return 'Choose the predefined prototype workspace.'
  if (!['success', 'error'].includes(setup.outcome)) return 'Choose a demo outcome.'
  if (setup.repositories.some(name => !traceRepositories.some(repository => repository.name === name)) || new Set(setup.repositories).size !== setup.repositories.length) return 'Choose only the listed demo repositories.'
  if (id === 'github' && !setup.repositories.length) return 'Choose at least one demo repository.'
  if (id !== 'github' && setup.repositories.length) return 'Repository scope applies only to GitHub App.'
  return ''
}
export function applyIntegrationAction(integrations: Integration[], id: SourceId, role: IntegrationRole, action: IntegrationAction, at: string) {
  const fail = (message: string) => ({ ok: false, integrations, message })
  if (role !== 'Administrator') return fail(`${role} is read-only for integration configuration.`)
  const current = integrations.find(integration => integration.id === id)
  if (!current) return fail('Integration not found.')
  if (action.type === 'configure') { const error = validateDemoSetup(id, action.setup); if (error) return fail(error) }
  if (action.type === 'disconnect' && !current.configured) return fail('This demo integration is not configured.')
  if (action.type === 'check' && (!current.configured || current.status === 'Disconnected' || current.status === 'Not Configured')) return fail('Configure the demo integration before checking it.')
  const failed = action.type === 'configure' ? action.setup.outcome === 'error' : action.type === 'check' && action.outcome === 'error'
  const status: ConnectionState = action.type === 'disconnect' ? 'Disconnected' : failed ? 'Error' : 'Connected'
  const title = action.type === 'disconnect' ? 'Disconnected in the local simulation' : action.type === 'configure' ? 'Demo configuration applied' : 'Simulated connection check completed'
  const result = failed ? 'Demo error; no service was contacted.' : action.type === 'disconnect' ? 'No real access was revoked.' : 'Demo success; no service was contacted. Reporting completeness is unchanged.'
  const updated: Integration = { ...current, status, configured: action.type === 'configure' ? true : current.configured, repositories: action.type === 'configure' ? [...action.setup.repositories] : current.repositories, events: [...current.events, { id: `${id}-local-${current.events.length + 1}`, title, at, result }] }
  return { ok: true, integrations: integrations.map(integration => integration.id === id ? updated : integration), message: `${title}. ${result}` }
}
export function integrationPreview(state: string | null): Integration[] {
  const integrations = createIntegrations()
  if (state === 'empty') return []
  return integrations.map(integration => integration.id === 'github' && ['disconnected', 'connection-error', 'not-configured'].includes(state ?? '') ? { ...integration, status: state === 'disconnected' ? 'Disconnected' as const : state === 'connection-error' ? 'Error' as const : 'Not Configured' as const, configured: state !== 'not-configured' } : integration)
}
