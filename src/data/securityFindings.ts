import { dailyActivity, parsePeriod, type Period } from './companyOverview.ts'
import { departments, type DepartmentId } from './departments.ts'
import { employees, entityFindings, entitySessions, type Finding } from './entityAnalytics.ts'

export const securityStatuses = ['Open', 'In Review', 'Resolved'] as const
export type ReviewStatus = typeof securityStatuses[number]
export type SecurityRole = 'Administrator' | 'Viewer'
export type EvidenceAvailability = 'Demo sample' | 'Missing'
export type FindingActivity = { id: string; at: string; actor: string; message: string; note?: string }
export type SecurityFinding = Finding & {
  investigationTitle: string
  description: string
  category: string
  source: 'Synthetic detector fixture'
  rule: string
  departmentId: DepartmentId
  repository: string | null
  agent: string | null
  candidateSessionId: string | null
  relationship: 'Unverified candidate' | 'Not Available'
  evidence: { availability: EvidenceAvailability; excerpt: string | null; explanation: string }
  reviewStatus: ReviewStatus
  assigneeId: string | null
  activity: FindingActivity[]
}

const definitions = {
  'Potential credential exposure': {
    title: 'Credential pattern detected in terminal output', category: 'Secret exposure',
    description: 'A credential-like test pattern was recorded in a synthetic terminal-output sample. This does not confirm a real credential leak or incident.',
    rule: 'Secret exposure — matches a synthetic credential-like test pattern in the supplied demo sample.',
    excerpt: 'DEMO_TERMINAL_OUTPUT: credential=[REDACTED_DEMO_PATTERN]',
  },
  'Sensitive content in AI context': {
    title: 'Sensitive content pattern in AI context', category: 'Sensitive content',
    description: 'A synthetic prompt-context sample contains a placeholder marked as sensitive. No real prompt, secret, or personal data is included.',
    rule: 'Sensitive context — matches a labeled placeholder in a sanitized demo context sample.',
    excerpt: 'DEMO_CONTEXT: account_reference=[REDACTED_DEMO_VALUE]',
  },
  'Dependency requires review': {
    title: 'Dependency requires security review', category: 'Dependency review',
    description: 'A demo dependency-review signal was added to the queue. No scan report or package evidence was supplied, so a vulnerability is not confirmed.',
    rule: 'Dependency review — a fixture-only review request; no live package scan was performed.',
    excerpt: null,
  },
  'Policy review required': {
    title: 'AI usage policy review required', category: 'Policy review',
    description: 'A synthetic policy-review flag needs human assessment. The fixture is not proof that a real policy was violated.',
    rule: 'Policy review — evaluates an explicitly synthetic scenario, not a real organization policy violation.',
    excerpt: 'DEMO_POLICY_EVENT: review_required=true; payload=[SANITIZED]',
  },
} as const

export function createSecurityFindings(): SecurityFinding[] {
  return entityFindings.map(base => {
    const definition = definitions[base.title as keyof typeof definitions]
    const employee = employees.find(item => item.id === base.employeeId)!
    const department = departments.find(item => item.homeDepartment === employee.department)!
    // No event-level security/session join exists in the shared fixtures.
    // Matching person, device and earlier activity is a candidate, never proof.
    const candidate = entitySessions.find(session => session.employeeId === base.employeeId && session.deviceId === base.deviceId && Date.parse(session.lastActivity) <= Date.parse(base.detectedAt))
    const availability: EvidenceAvailability = definition.excerpt === null ? 'Missing' : 'Demo sample'
    return {
      ...base, investigationTitle: definition.title, description: definition.description, category: definition.category,
      rule: definition.rule, source: 'Synthetic detector fixture', departmentId: department.id,
      repository: candidate?.repository ?? null, agent: candidate?.agent ?? null, candidateSessionId: candidate?.id ?? null,
      relationship: candidate ? 'Unverified candidate' : 'Not Available',
      evidence: { availability, excerpt: definition.excerpt, explanation: availability === 'Missing' ? 'No supporting artifact was supplied. This is a review signal, not a verified vulnerability.' : 'This explicit synthetic artifact is confirmed to exist in the demo fixture only. It does not verify a real incident or a link to session activity.' },
      reviewStatus: 'Open', assigneeId: null,
      activity: [
        { id: `${base.id}-event-1`, at: base.detectedAt, actor: 'Prototype fixture', message: 'Demo finding created.' },
        { id: `${base.id}-event-2`, at: new Date(Date.parse(base.detectedAt) + 30_000).toISOString(), actor: 'Prototype fixture', message: availability === 'Missing' ? 'Supporting evidence not supplied.' : 'Redacted synthetic sample attached.' },
        { id: `${base.id}-event-3`, at: new Date(Date.parse(base.detectedAt) + 60_000).toISOString(), actor: 'Prototype fixture', message: 'Added to the local review queue; no real security system was contacted.' },
      ],
    }
  })
}

export type SecurityFilters = { query: string; severity: string; agent: string; status: 'All' | ReviewStatus; repository: string; employee: string; department: string; assignee: string; evidence: string; period: Period }
export function parseSecurityFilters(params: URLSearchParams): SecurityFilters {
  const severity = ['Critical', 'High', 'Medium'].find(value => value.toLowerCase() === params.get('severity')?.toLowerCase()) ?? ''
  const status = securityStatuses.find(value => value.toLowerCase() === params.get('status')?.toLowerCase()) ?? 'All'
  return { query: params.get('q') ?? '', severity, agent: params.get('agent') ?? '', status, repository: params.get('repository') ?? '', employee: params.get('employee') ?? '', department: params.get('department') ?? '', assignee: params.get('assignee') ?? '', evidence: params.get('evidence') ?? '', period: parsePeriod(params.get('period')) }
}
export function filterSecurityFindings(findings: SecurityFinding[], filters: SecurityFilters, ignoreStatus = false) {
  const query = filters.query.trim().toLowerCase()
  const start = dailyActivity.at(-filters.period)!.date
  const end = dailyActivity.at(-1)!.date
  return findings.filter(finding => {
    const employee = employees.find(item => item.id === finding.employeeId)!
    const department = departments.find(item => item.id === finding.departmentId)!
    return finding.detectedAt.slice(0, 10) >= start && finding.detectedAt.slice(0, 10) <= end
      && (!query || [finding.id, finding.title, finding.investigationTitle, employee.name, department.name, finding.deviceId, finding.repository ?? '', finding.candidateSessionId ?? ''].some(value => value.toLowerCase().includes(query)))
      && (!filters.severity || finding.severity === filters.severity)
      && (!filters.agent || finding.agent === filters.agent)
      && (ignoreStatus || filters.status === 'All' || finding.reviewStatus === filters.status)
      && (!filters.repository || finding.repository === filters.repository)
      && (!filters.employee || finding.employeeId === filters.employee)
      && (!filters.department || finding.departmentId === filters.department)
      && (!filters.assignee || (filters.assignee === 'unassigned' ? finding.assigneeId === null : finding.assigneeId === filters.assignee))
      && (!filters.evidence || finding.evidence.availability === filters.evidence)
  }).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt) || ['Critical', 'High', 'Medium'].indexOf(a.severity) - ['Critical', 'High', 'Medium'].indexOf(b.severity) || a.id.localeCompare(b.id, 'en-US', { numeric: true }))
}
export function securityPage(rows: SecurityFinding[], requested: number) {
  const pageCount = Math.ceil(rows.length / 5)
  const page = Math.max(1, Math.min(Number.isFinite(requested) ? Math.floor(requested) : 1, pageCount || 1))
  const offset = (page - 1) * 5
  return { rows: rows.slice(offset, offset + 5), page, pageCount, total: rows.length, start: rows.length ? offset + 1 : 0, end: Math.min(offset + 5, rows.length) }
}
export type ReviewAction = { type: 'review'; status: ReviewStatus; note: string } | { type: 'assign'; assigneeId: string | null }
export function applySecurityAction(findings: SecurityFinding[], id: string, role: SecurityRole, action: ReviewAction, at: string) {
  if (role !== 'Administrator') return { findings, changed: false, message: 'Viewer demo is read-only. Review and assignment changes are not permitted.' }
  const finding = findings.find(item => item.id === id)
  if (!finding) return { findings, changed: false, message: 'Finding not found.' }
  if (action.type === 'assign' && action.assigneeId !== null && !employees.some(employee => employee.id === action.assigneeId)) return { findings, changed: false, message: 'Choose an existing demo employee.' }
  if (action.type === 'review' && !securityStatuses.includes(action.status)) return { findings, changed: false, message: 'Choose a supported review status.' }
  const status = action.type === 'review' ? action.status : finding.reviewStatus
  const assigneeId = action.type === 'assign' ? action.assigneeId : finding.assigneeId
  const note = action.type === 'review' ? action.note.trim().slice(0, 2000) : ''
  if (status === finding.reviewStatus && assigneeId === finding.assigneeId && !note) return { findings, changed: false, message: 'No changes to save.' }
  const event: FindingActivity = {
    id: `${finding.id}-event-${finding.activity.length + 1}`, at, actor: 'Omar Allahham (demo)',
    message: action.type === 'assign' ? assigneeId ? `Assigned to ${employees.find(employee => employee.id === assigneeId)!.name}.` : 'Assignment cleared.' : status === finding.reviewStatus ? 'Review note saved.' : status === 'Resolved' ? 'Marked as reviewed in the local prototype. This does not confirm remediation.' : status === 'In Review' ? 'Review started in the local prototype.' : 'Finding reopened in the local prototype.',
    ...(note ? { note } : {}),
  }
  return {
    findings: findings.map(item => item.id === id ? { ...item, reviewStatus: status, assigneeId, activity: [...item.activity, event] } : item), changed: true,
    message: `${finding.id}: ${event.message} No live security system was changed.`,
  }
}

export function securityDetectedLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(new Date(value))
}
export function compactSecuritySession(id: string) { return id.length > 16 ? `${id.slice(0, 5)}…${id.slice(-2)}` : id }
