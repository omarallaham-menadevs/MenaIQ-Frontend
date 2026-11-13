import type { KeyboardEvent } from 'react'
import { Command, Monitor, Waypoints } from 'lucide-react'
import { type Integration } from '../../data/integrations'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { LoadingState } from '../ui/LoadingState'

export function IntegrationList({ integrations, selectedId, busy, error, onSelect, onRetry }: { integrations: Integration[]; selectedId: string | null; busy: boolean; error: boolean; onSelect: (id: string) => void; onRetry: () => void }) {
  function keys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowDown' ? Math.min(integrations.length - 1,index + 1) : event.key === 'ArrowUp' ? Math.max(0,index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? integrations.length - 1 : null
    if (next === null) return
    event.preventDefault(); onSelect(integrations[next].id); document.getElementById(`integration-${integrations[next].id}`)?.focus()
  }
  return <Card className="flex min-w-0 flex-col [&]:p-3"><div className="mx-2 border-b border-line pb-5 pt-1"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold leading-7">Connected Services</h2><Badge className="min-w-[83px] justify-center [&]:text-[11px]">{integrations.length} total</Badge></div><p className="mt-2 text-xs leading-5 text-muted">Select a service to review its connection.</p></div><div className="mt-5" aria-busy={busy}>{busy ? <LoadingState message="Loading integrations…" /> : error ? <ErrorState title="Unable to load integrations" description="The local prototype could not load its integration records." onRetry={onRetry} /> : !integrations.length ? <EmptyState title="No integrations found" description="No demo integration records are available in this preview." /> : <ul aria-label="Integration services" className="space-y-4">{integrations.map((integration,index) => {
    const Icon = integration.id === 'collectors' ? Monitor : integration.id === 'litellm' ? Command : Waypoints
    const selected = integration.id === selectedId
    return <li key={integration.id}><button type="button" id={`integration-${integration.id}`} data-integration-id={integration.id} aria-label={`Inspect ${integration.name}`} aria-pressed={selected} aria-controls="integration-details" onClick={() => onSelect(integration.id)} onKeyDown={event => keys(event,index)} className={`flex min-h-[154px] w-full gap-3 rounded-xl border px-3.5 py-4 text-left ${selected ? 'border-green-400 bg-selected/45' : 'border-line hover:bg-canvas'}`}><span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-selected text-accent' : 'bg-[#F1F5F3] text-[#65716A]'}`}><Icon size={19} strokeWidth={1.7} /></span><span className="min-w-0 flex-1"><span className="block text-base font-semibold leading-6">{integration.name}</span><span className="mt-1 block text-[11px] leading-5 text-muted">{integration.description}</span><span className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs leading-5">{integration.purpose}</span><IntegrationBadge integration={integration} /></span><span className="mt-1 block text-[11px] leading-5 text-muted">{integration.configured ? 'Demo configuration available' : 'Setup Not Configured'}</span></span></button></li>
  })}</ul>}</div></Card>
}
export function IntegrationBadge({ integration }: { integration: Integration }) { return <Badge tone={integration.status === 'Connected' ? 'success' : integration.status === 'Error' ? 'warning' : 'neutral'} className="min-w-[100px] justify-center [&]:text-[11px]">{integration.status}</Badge> }
