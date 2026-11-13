import { useEffect, useState } from 'react'
import { CalendarDays, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { periods } from '../data/companyOverview'
import { applySecurityAction, createSecurityFindings, filterSecurityFindings, parseSecurityFilters, securityPage, type ReviewAction } from '../data/securityFindings'
import { FindingsQueue } from '../components/security/FindingsQueue'
import { FindingInvestigation, type InvestigationTab } from '../components/security/FindingInvestigation'
import { ReviewResolution } from '../components/security/ReviewResolution'
import type { SecurityExtraFilters } from '../components/security/SecurityQueueFilters'

export function SecurityFindingsPage() {
  const [params, setParams] = useSearchParams()
  const [findings, setFindings] = useState(createSecurityFindings)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const filters = parseSecurityFilters(params)
  const role = params.get('role') === 'viewer' ? 'Viewer' : 'Administrator'
  const state = params.get('state') ?? 'ready'
  const busy = loading || state === 'loading'
  const tab = (['Details', 'Evidence', 'Activity', 'Context'].find(value => value === params.get('detail')) ?? 'Details') as InvestigationTab
  const rows = state === 'empty' ? [] : filterSecurityFindings(findings, filters)
  const scope = state === 'empty' ? [] : filterSecurityFindings(findings, filters, true)
  const counts = { All: scope.length, Open: scope.filter(row => row.reviewStatus === 'Open').length, 'In Review': scope.filter(row => row.reviewStatus === 'In Review').length, Resolved: scope.filter(row => row.reviewStatus === 'Resolved').length }
  const selectedId = params.get('finding') ?? rows[0]?.id ?? null
  const selected = busy || state === 'error' || state === 'empty' ? null : findings.find(finding => finding.id === selectedId) ?? null
  const selectedIndex = rows.findIndex(row => row.id === selectedId)
  const result = securityPage(rows, Number(params.get('page') ?? Math.floor(Math.max(0, selectedIndex) / 5) + 1))
  const open = filterSecurityFindings(findings, { ...filters, severity: '', status: 'Open' })

  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 180); return () => window.clearTimeout(timer) }, [filters.period, state])
  function update(values: Record<string, string>, reset = false) {
    setParams(() => {
      const next = new URLSearchParams(window.location.search)
      for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key) }
      if (reset) { next.delete('page'); next.delete('detail'); next.set('finding', 'none') }
      return next
    })
    setFeedback('')
  }
  function filter(key: string, value: string) { if (key === 'period') setLoading(true); update({ [key]: value }, true) }
  function resetFilters() { setParams({ period: String(filters.period), ...(role === 'Viewer' ? { role: 'viewer' } : {}) }); setFeedback('') }
  function action(value: ReviewAction) {
    if (!selected) return
    const currentRole = new URLSearchParams(window.location.search).get('role') === 'viewer' ? 'Viewer' : 'Administrator'
    const result = applySecurityAction(findings, selected.id, currentRole, value, new Date().toISOString())
    setFindings(result.findings); setFeedback(result.message)
  }
  return <div className="lg:pt-1">
    <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start"><div className="flex items-start gap-4"><div className="hidden size-[54px] shrink-0 items-center justify-center rounded-xl bg-selected text-success sm:flex"><ShieldCheck size={29} strokeWidth={1.7} aria-hidden="true" /></div><div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Security Findings</h1><p className="mt-1 text-sm leading-5 text-muted">Investigate and resolve detected security risks from AI coding agents.</p></div></div><div className="flex flex-wrap items-center gap-3"><div className="relative w-[200px]"><CalendarDays size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5" /><select aria-label="Security reporting period" value={filters.period} onChange={event => filter('period', event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-sm">{periods.map(period => <option key={period} value={period}>Last {period} days</option>)}</select></div></div></header>
    <div className="mt-6 flex flex-wrap items-center gap-3">{(['Critical', 'High', 'Medium'] as const).map(severity => <button key={severity} type="button" aria-pressed={filters.severity === severity} onClick={() => filter('severity', filters.severity === severity ? '' : severity)} className={`min-h-[30px] rounded-full px-4 text-xs font-medium ${severity === 'Critical' ? 'bg-danger-soft text-danger' : severity === 'High' ? 'bg-warning-soft text-warning' : 'bg-[#FFF6D8] text-[#946000]'}`}><span aria-hidden="true">● </span>{open.filter(finding => finding.severity === severity).length} {severity}</button>)}<span className="text-xs text-muted">{open.length} open findings</span></div>
    {role === 'Viewer' && <p role="status" className="mt-4 text-xs text-muted">Viewer role preview: read-only access. This is a demo permission switch, not authentication.</p>}
    <div className="mt-[22px] grid items-start gap-3.5 2xl:grid-cols-[minmax(0,0.68fr)_minmax(0,1fr)]">
      <FindingsQueue result={result} selectedId={selected?.id ?? null} filters={filters} counts={counts} busy={busy} error={state === 'error'} onFilter={filter} onMoreFilters={(values: SecurityExtraFilters) => update(values, true)} onSelect={id => update({ finding: id, page: String(result.page), detail: '' })} onPage={page => update({ page: String(page), finding: 'none' })} onReset={resetFilters} onRetry={() => update({ state: '' })} />
      <div className="min-w-0 space-y-[18px]"><FindingInvestigation finding={selected} tab={tab} period={filters.period} missing={!!selectedId && selectedId !== 'none' && !selected && !busy && state === 'ready'} onTab={detail => update({ detail })} onClose={() => { update({ finding: 'none' }); document.querySelector<HTMLButtonElement>(`[data-finding-id="${selected?.id}"]`)?.focus() }} /><ReviewResolution key={selected?.id ?? 'none'} finding={selected} role={role} feedback={feedback} onAction={action} /></div>
    </div>
  </div>
}
