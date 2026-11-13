import type { KeyboardEvent, ReactNode } from 'react'
import { Diamond, FileSearch, Info, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { departments } from '../../data/departments'
import { employees, entitySessions } from '../../data/entityAnalytics'
import { formatActivity, type Period } from '../../data/companyOverview'
import { traceRepositories } from '../../data/traceability'
import { compactSecuritySession, securityDetectedLabel, type SecurityFinding } from '../../data/securityFindings'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { Badge } from '../ui/Badge'
import { SeverityBadge, ReviewStatusBadge } from './SecurityBadges'

const investigationTabs = ['Details', 'Evidence', 'Activity', 'Context'] as const
export type InvestigationTab = typeof investigationTabs[number]

export function FindingInvestigation({ finding, tab, period, missing, onTab, onClose }: { finding: SecurityFinding | null; tab: InvestigationTab; period: Period; missing: boolean; onTab: (value: InvestigationTab) => void; onClose: () => void }) {
  if (!finding) return <Card id="security-investigation" className="min-w-0 px-6 py-6 2xl:min-h-[518px]"><EmptyState title={missing ? 'Finding not found' : 'No finding selected'} description={missing ? 'This ID is not in the prototype findings dataset.' : 'Select a finding from the queue to inspect its details and evidence.'} /></Card>
  const employee = employees.find(item => item.id === finding.employeeId)!
  const department = departments.find(item => item.id === finding.departmentId)!
  const candidate = entitySessions.find(session => session.id === finding.candidateSessionId)
  const repositoryExists = finding.repository && traceRepositories.some(repository => repository.name === finding.repository)

  function keyNavigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % investigationTabs.length : event.key === 'ArrowLeft' ? (index + investigationTabs.length - 1) % investigationTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? investigationTabs.length - 1 : null
    if (next === null) return
    event.preventDefault(); onTab(investigationTabs[next]); document.getElementById(`finding-tab-${next}`)?.focus()
  }
  return <Card id="security-investigation" className="min-w-0 px-6 py-6 2xl:min-h-[518px]">
    <div className="flex justify-between gap-4"><p className="text-xs leading-4 text-muted">{finding.id}</p><button type="button" aria-label="Deselect finding" onClick={onClose} className="-mt-1 rounded p-1 text-muted hover:bg-neutral"><X size={17} aria-hidden="true" /></button></div>
    <h2 className="mt-3 text-[22px] font-bold leading-7 tracking-tight">{finding.investigationTitle}</h2>
    <div className="mt-3 flex flex-wrap items-center gap-3"><SeverityBadge severity={finding.severity} compact={false} /><ReviewStatusBadge status={finding.reviewStatus} compact={false} /><p className="text-xs text-muted">Detected: <time dateTime={finding.detectedAt}>{securityDetectedLabel(finding.detectedAt)} UTC</time></p></div>
    <div role="tablist" aria-label="Finding investigation tabs" className="mt-8 grid min-h-[42px] grid-cols-4 border-b border-line">{investigationTabs.map((item, index) => <button type="button" role="tab" key={item} id={`finding-tab-${index}`} aria-selected={tab === item} aria-controls="finding-tab-content" tabIndex={tab === item ? 0 : -1} onClick={() => onTab(item)} onKeyDown={event => keyNavigate(event, index)} className={`relative py-2 text-left text-[13px] ${tab === item ? 'font-medium text-accent after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-16 after:bg-accent' : 'text-muted hover:text-ink'}`}>{item === 'Activity' ? `Activity (${finding.activity.length})` : item}</button>)}</div>
    <div id="finding-tab-content" role="tabpanel" aria-labelledby={`finding-tab-${investigationTabs.indexOf(tab)}`} tabIndex={0} className="mt-6 rounded-lg">
      {tab === 'Details' && <>
        <SectionHeading icon={<Info size={20} />} title="What Happened" /><p className="ml-8 mt-2 text-[13px] leading-[22px]">{finding.description}</p>
        <dl className="mt-7 grid grid-cols-2 gap-4 rounded-xl border border-line bg-canvas/50 px-4 py-3 sm:grid-cols-4">
          <ContextField label="AI Agent">{finding.agent ?? 'Not Available'}</ContextField><ContextField label="Department">{department.name}</ContextField><ContextField label="Employee">{employee.name}</ContextField><ContextField label="Candidate Session">{candidate ? <Link to={`/sessions?session=${encodeURIComponent(candidate.id)}&period=${period}`} title={`Unverified candidate: ${candidate.id}`} aria-label={`Open candidate session ${candidate.id}`} className="block truncate rounded text-accent hover:underline">{compactSecuritySession(candidate.id)} ↗</Link> : 'Not Available'}</ContextField>
        </dl>
        <div className="mt-5 border-t border-line pt-6"><SectionHeading icon={<Diamond size={19} />} title="Detection Rule" /><p className="ml-8 mt-1 text-xs leading-5 text-muted">{finding.rule}</p></div>
      </>}
      {tab === 'Evidence' && <><SectionHeading icon={<FileSearch size={20} />} title="Supporting Evidence" /><div className="ml-8 mt-3"><Badge tone={finding.evidence.availability === 'Missing' ? 'neutral' : 'success'}>{finding.evidence.availability === 'Missing' ? 'Evidence Not Available' : 'Recorded synthetic sample'}</Badge><p className="mt-3 text-sm leading-6 text-muted">{finding.evidence.explanation}</p>{finding.evidence.excerpt && <pre className="mt-4 whitespace-pre-wrap break-all rounded-lg border border-line bg-canvas p-4 font-mono text-xs leading-6">{finding.evidence.excerpt}</pre>}<p className="mt-4 text-xs leading-5 text-muted">Session relationship: {finding.relationship}. Same employee/device and earlier activity do not prove that the sample came from that session.</p><p className="mt-2 text-xs text-muted">Source: {finding.source}. No live scan or verified incident.</p></div></>}
      {tab === 'Activity' && <><SectionHeading icon={<Info size={20} />} title="Finding Activity" /><ol className="ml-8 mt-3 divide-y divide-line">{finding.activity.map(event => <li key={event.id} className="py-3"><p className="text-sm font-medium">{event.message}</p>{event.note && <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-canvas p-3 text-sm leading-6">{event.note}</p>}<p className="mt-2 text-xs text-muted">{event.actor} · <time dateTime={event.at}>{formatActivity(event.at)} UTC</time></p></li>)}</ol></>}
      {tab === 'Context' && <dl className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2"><ContextField label="Reporting title">{finding.title}</ContextField><ContextField label="Affected employee"><Link to={`/entity-analytics?entity=${employee.id}&period=${period}`} className="rounded text-accent hover:underline">{employee.name}</Link></ContextField><ContextField label="Department">{department.name}</ContextField><ContextField label="Device">{finding.deviceId}</ContextField><ContextField label="Repository (candidate context)">{repositoryExists ? <Link to={`/code-traceability?tab=Repositories&repository=${encodeURIComponent(finding.repository!)}&row=${encodeURIComponent(finding.repository!)}&period=${period}`} className="rounded text-accent hover:underline">{finding.repository}</Link> : 'Not Available'}</ContextField><ContextField label="Session relationship">{finding.relationship}</ContextField><ContextField label="Source">{finding.source}</ContextField><ContextField label="Assignee">{employees.find(item => item.id === finding.assigneeId)?.name ?? 'Unassigned'}</ContextField></dl>}
    </div>
  </Card>
}
function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) { return <h3 className="flex items-center gap-3 text-sm font-semibold"><span aria-hidden="true" className="text-accent">{icon}</span>{title}</h3> }
function ContextField({ label, children }: { label: string; children: ReactNode }) { return <div className="min-w-0"><dt className="text-[10px] leading-4 text-muted">{label}</dt><dd className="mt-1 break-words text-xs font-semibold leading-5">{children}</dd></div> }
