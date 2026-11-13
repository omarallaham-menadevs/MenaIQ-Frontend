import { ArrowDown, ArrowUp, ArrowUpDown, Info } from 'lucide-react'
import { formatCost } from '../../data/entityAnalytics'
import { formatPercent, usageTokenLabel, type ModelUsage, type UsageSortKey } from '../../data/usageAndCost'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function ModelUsageTable({ rows, showPercent, onToggle, sortKey, descending, onSort }: { rows: ModelUsage[]; showPercent: boolean; onToggle: () => void; sortKey: UsageSortKey | null; descending: boolean; onSort: (key: UsageSortKey) => void }) {
  function header(label: string, key: UsageSortKey) {
    const sorted = key === sortKey
    const Icon = sorted ? descending ? ArrowDown : ArrowUp : ArrowUpDown
    return <th scope="col" aria-sort={sorted ? descending ? 'descending' : 'ascending' : 'none'} className="px-5 py-0 font-medium"><button type="button" onClick={() => onSort(key)} aria-label={`Sort models by ${label}`} className="group inline-flex min-h-10 items-center gap-1.5 rounded text-left">{label}<Icon size={13} aria-hidden="true" className={sorted ? '' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'} /></button></th>
  }
  return <Card className="min-h-[320px] min-w-0 px-6 py-3.5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[23px] font-bold leading-8 tracking-tight">Model Usage Details</h2><p className="mt-0.5 text-sm leading-5 text-muted">Usage and estimated cost by AI model.</p></div><label className="mt-1.5 flex items-center gap-2 text-xs text-muted">% of Total<span title="Shares of filtered requests, measured gateway tokens, and known company-key estimates respectively."><Info size={13} aria-hidden="true" /></span><button type="button" role="switch" aria-label="Show percentage of total" aria-checked={showPercent} onClick={onToggle} className={`relative ml-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full ${showPercent ? 'bg-accent' : 'bg-muted'}`}><span aria-hidden="true" className={`absolute size-4 rounded-full bg-white ${showPercent ? 'left-[18px]' : 'left-0.5'}`} /></button></label></div>
    <div role="region" aria-label="Model usage details, scroll horizontally on small screens" tabIndex={0} className="mt-2.5 overflow-x-auto rounded-lg">
      <table className={`w-full table-fixed text-left text-sm ${showPercent ? 'min-w-[1120px]' : 'min-w-[700px]'}`}>
        <caption className="sr-only">Model usage derived from the same filtered gateway request records. Cost shares refer to known company-key estimates; unavailable costs are excluded rather than counted as zero.</caption>
        <colgroup>{(showPercent ? ['19%', '12%', '13%', '16.5%', '13%', '15%', '11.5%'] : ['30%', '20%', '25%', '25%']).map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
        <thead className="bg-neutral text-[13px]"><tr>{header('Model', 'model')}{header('Requests', 'requests')}{showPercent && <th scope="col" aria-label="Requests percent of filtered total" className="px-5 py-2 font-normal">% of Total</th>}{header('Measured Tokens', 'measuredTokens')}{showPercent && <th scope="col" aria-label="Tokens percent of measured total" className="px-5 py-2 font-normal">% of Total</th>}{header('Estimated Cost', 'estimatedCostCents')}{showPercent && <th scope="col" aria-label="Cost percent of known company-key subtotal" className="px-5 py-2 font-normal">% of Total</th>}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.model} className="h-[38px] border-b border-line/60 hover:bg-canvas"><th scope="row" className="px-5 py-1.5 text-[13px] font-semibold">{row.model}</th><td className="px-5 py-1.5">{row.requests.toLocaleString('en-US')}</td>{showPercent && <td className="px-5 py-1.5"><Share value={row.requestPercent} /></td>}<td className="px-5 py-1.5" title={row.measuredTokens?.toLocaleString('en-US')}>{row.measuredTokens === null ? <Unavailable /> : usageTokenLabel(row.measuredTokens)}</td>{showPercent && <td className="px-5 py-1.5"><Share value={row.tokenPercent} /></td>}<td className="px-5 py-1.5">{row.estimatedCostCents === null ? <Unavailable /> : formatCost(row.estimatedCostCents)}</td>{showPercent && <td className="px-5 py-1.5"><Share value={row.costPercent} /></td>}</tr>)}</tbody>
      </table>
    </div>
    <UsageDisclaimer />
  </Card>
}
function Share({ value }: { value: number | null }) { return value === null ? <span className="text-muted">—</span> : <Badge tone="success" className="px-4 py-0.5 text-xs">{formatPercent(value)}</Badge> }
export function Unavailable() { return <Badge className="whitespace-nowrap py-0.5 text-xs">Not Available</Badge> }
export function UsageDisclaimer() {
  return <p className="mt-2.5 flex items-start gap-2 text-[11px] leading-5 text-muted"><Info size={15} aria-hidden="true" className="mt-0.5 shrink-0" /><span>Prototype data · Tokens are LiteLLM-observed only. Costs and cost percentages use known company-key estimates, not billed charges. Personal-key costs are Not Available and excluded from cost percentages.</span></p>
}
