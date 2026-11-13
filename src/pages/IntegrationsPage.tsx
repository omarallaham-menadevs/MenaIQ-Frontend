import { useEffect, useRef, useState } from 'react'
import { Command, Info, TriangleAlert } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { integrationAttention, integrationRole, integrationTabs, type IntegrationAction } from '../data/integrations'
import { IntegrationList } from '../components/integrations/IntegrationList'
import { IntegrationDetails } from '../components/integrations/IntegrationDetails'
import { IntegrationDialog } from '../components/integrations/IntegrationDialog'
import { Button } from '../components/ui/Button'
import { applySourceAction, previewSourcePrototype } from '../data/sourcePrototype'
import { commitSourcePrototype, useSourcePrototype } from '../data/sourcePrototypeStore'

export function IntegrationsPage() {
  const [params,setParams] = useSearchParams()
  const snapshot = previewSourcePrototype(useSourcePrototype(),params)
  const integrations = params.get('state') === 'empty' ? [] : snapshot.integrations
  const [mode,setMode] = useState<'setup' | 'disconnect' | 'docs' | null>(null)
  const [feedback,setFeedback] = useState('')
  const [checking,setChecking] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current),[])
  const role = integrationRole(params)
  const state = params.get('state') ?? 'ready'
  const busy = state === 'loading'
  const filter = params.get('filter') ?? ''
  const visible = integrations.filter(integration => filter === 'connected' ? !integrationAttention(integration) : filter === 'attention' ? integrationAttention(integration) : true)
  const selectedId = params.get('source') ?? (visible.some(integration => integration.id === 'github') ? 'github' : visible[0]?.id ?? 'none')
  const selected = busy || state === 'error' ? null : visible.find(integration => integration.id === selectedId) ?? null
  const tab = integrationTabs.find(value => value === params.get('tab')) ?? 'Overview'
  const healthy = integrations.filter(integration => !integrationAttention(integration)).length
  function update(values: Record<string,string>) { setParams(() => { const next = new URLSearchParams(window.location.search); for (const [key,value] of Object.entries(values)) { if (value) next.set(key,value); else next.delete(key) } return next }) }
  function action(value: IntegrationAction) {
    if (!selected || checking) return { ok: false,message: 'Choose an integration and wait for any pending check.' }
    const result = applySourceAction(snapshot,selected.id,integrationRole(new URLSearchParams(window.location.search)),value,new Date().toISOString())
    if (result.ok) { commitSourcePrototype(result.snapshot); update({ scenario: '',state: '' }) }
    setFeedback(result.message)
    return result
  }
  function check() {
    if (!selected || role !== 'Administrator' || checking) return
    const id = selected.id
    setChecking(id); setFeedback('')
    timer.current = window.setTimeout(() => {
      const query = new URLSearchParams(window.location.search)
      const result = applySourceAction(snapshot,id,integrationRole(query),{ type: 'check',outcome: query.get('check') === 'error' ? 'error' : 'success' },new Date().toISOString())
      if (result.ok) { commitSourcePrototype(result.snapshot); update({ scenario: '',state: '' }) }
      setFeedback(result.message); setChecking(null)
    },800)
  }
  return <div className="lg:-mt-1"><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="flex items-start gap-[18px]"><div className="hidden size-[54px] shrink-0 items-center justify-center rounded-xl bg-selected text-accent sm:flex"><Command size={24} strokeWidth={1.7} aria-hidden="true" /></div><div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Integrations</h1><p className="mt-1 text-[13px] leading-5 text-muted">Manage and review the data sources connected to MenaIQ.</p></div></div><Button variant="secondary" onClick={() => setMode('docs')} className="min-h-11 min-w-[182px] text-xs">↗ Documentation</Button></header>
    <div aria-label="Integration status filters" className="mt-6 flex flex-wrap items-center gap-3"><button type="button" aria-pressed={filter === 'connected'} onClick={() => update({ filter: filter === 'connected' ? '' : 'connected',source: '' })} className="flex min-h-[29px] min-w-[128px] items-center gap-1.5 rounded-full bg-selected px-3 text-xs font-medium text-accent"><span aria-hidden="true" className="size-2 rounded-full bg-accent" />{healthy} Connected</button><button type="button" aria-pressed={filter === 'attention'} onClick={() => update({ filter: filter === 'attention' ? '' : 'attention',source: '' })} className="flex min-h-[29px] min-w-[185px] items-center gap-1.5 rounded-full bg-warning-soft px-3 text-xs font-medium text-warning"><TriangleAlert size={12} fill="currentColor" stroke="var(--color-warning-soft)" aria-hidden="true" />{integrations.length - healthy} Not connected</button><span className="ml-4 text-xs text-muted">{integrations.length} supported integrations</span>{filter && <button type="button" onClick={() => update({ filter: '',source: '' })} className="rounded text-xs text-accent hover:underline">Clear filter</button>}</div>
    {role !== 'Administrator' && <p role="status" className="mt-4 text-xs text-muted">{role} demo: read-only integration access. Global configuration actions are Administrator-only.</p>}
    {feedback && <p role="status" className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-xs leading-5 text-accent">{feedback} Shared demo connection changes are reflected in Coverage &amp; Health; reporting completeness is independent.</p>}
    <div className="mt-[23px] grid items-start gap-4 2xl:grid-cols-[minmax(0,0.68fr)_minmax(0,1fr)]"><IntegrationList integrations={visible} selectedId={selected?.id ?? null} busy={busy} error={state === 'error'} onSelect={source => update({ source,tab: '' })} onRetry={() => update({ state: '' })} /><div className="min-w-0 space-y-[18px]"><IntegrationDetails integration={selected} tab={tab} role={role} checking={checking === selected?.id} missing={!busy && state !== 'error' && params.has('source') && selectedId !== 'none' && !selected} onTab={tab => update({ tab })} onClose={() => { update({ source: 'none' }); document.getElementById(`integration-${selected?.id}`)?.focus() }} onSetup={() => setMode('setup')} onDisconnect={() => setMode('disconnect')} onCheck={check} />{selected && integrationAttention(selected) && <div className="flex items-start gap-4 rounded-xl border border-orange-200 bg-[#FFF8F1] px-5 py-5"><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-lg font-semibold text-warning">!</span><div><h2 className="text-base font-semibold">{selected.status !== 'Connected' ? `${selected.status} (demo)` : 'Connection configuration'}</h2><p className="mt-2 text-xs leading-5 text-muted">{selected.status !== 'Connected' ? 'This shared demo configuration is not connected. Configure or retry it using the integration actions menu.' : 'Review connection settings and permitted access scope. No live service is contacted.'}</p><button type="button" onClick={() => update({ tab: 'Connection Events' })} className="mt-3 rounded text-xs font-semibold text-accent hover:underline">View Connection Events ↗</button></div></div>}<div className="rounded-xl bg-[#F0F5F2] px-6 py-4"><h2 className="flex items-center gap-3 text-sm font-medium"><Info size={16} aria-hidden="true" className="text-accent" />Manage access securely</h2><p className="ml-7 mt-2 text-[11px] leading-5 text-muted">Configuration actions require permission. Credentials and secrets are never displayed.</p></div></div></div><p className="mt-3 text-[10px] leading-5 text-muted">Demo integrations only · no live services connected · shared connection settings persist for this browser tab session.</p>
    {mode && (mode === 'docs' || selected) && <IntegrationDialog key={`${mode}-${selected?.id}`} mode={mode} integration={selected} role={role} onAction={action} onDismiss={() => setMode(null)} />}
  </div>
}
