import { formatCost, formatTokens } from '../../data/entityAnalytics'
import { formatAxisValue, getChartAxis, type DepartmentMetric, type DepartmentRow } from '../../data/departments'
import { Card } from '../ui/Card'

export function DepartmentChart({ rows, metric, onMetricChange }: { rows: DepartmentRow[]; metric: DepartmentMetric; onMetricChange: (value: DepartmentMetric) => void }) {
  const axis = getChartAxis(rows, metric)
  const hasValues = rows.some(row => (metric === 'tokens' ? row.measuredTokens : row.costCents) !== null)
  return (
    <Card className="px-6 py-[18px] sm:min-h-[399px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-[23px] font-bold leading-8 tracking-tight">{metric === 'tokens' ? 'Token Usage by Department' : 'Estimated Cost by Department'}</h2><p className="mt-0.5 text-base leading-6 text-muted">{metric === 'tokens' ? 'Total measured tokens per department over the selected period.' : 'Estimated company-key cost per department over the selected period.'}</p></div>
        <div role="group" aria-label="Chart metric" className="grid min-h-11 w-[230px] grid-cols-2 rounded-[14px] border border-line bg-surface p-1">
          {(['tokens', 'cost'] as const).map(value => <button key={value} type="button" aria-pressed={metric === value} onClick={() => onMetricChange(value)} className={`rounded-xl px-3 py-1 text-base font-semibold ${metric === value ? 'bg-success-soft text-success' : 'hover:bg-canvas'}`}>{value === 'tokens' ? 'Tokens' : 'Cost'}</button>)}
        </div>
      </div>
      <figure className="mb-3 mt-[43px]" aria-label={metric === 'tokens' ? 'Measured tokens by department' : 'Estimated cost in US dollars by department'}>
        <figcaption className="sr-only">{metric === 'tokens' ? 'Measured tokens from the LiteLLM gateway.' : 'Estimated costs for company-provided API keys.'} Values are prototype data. Departments with no recorded activity show zero; missing measurements show Not Available.</figcaption>
        <div className="space-y-[27px]">
          {rows.map(row => {
            const value = metric === 'tokens' ? row.measuredTokens : row.costCents
            const label = metric === 'tokens' ? formatTokens(value) : formatCost(value)
            return <div key={row.id} className="grid min-h-7 grid-cols-[90px_minmax(0,1fr)_72px] items-center gap-3 sm:grid-cols-[136px_minmax(0,1fr)_56px] sm:gap-4">
              <span className="whitespace-nowrap text-left text-xs font-medium sm:text-lg">{row.name}</span>
              <div className="h-5 overflow-hidden rounded-full bg-neutral" aria-hidden="true"><div className="h-full rounded-full bg-[#009B3A]" style={{ width: `${value === null ? 0 : value / axis.max * 100}%` }} /></div>
              <span className={`text-right font-medium ${value === null ? 'text-xs text-muted' : 'text-xs sm:text-lg'}`}>{label}</span>
            </div>
          })}
        </div>
        {hasValues ? <div aria-hidden="true" className="ml-[102px] mr-[84px] mt-4 border-t border-line pt-4 sm:ml-[152px] sm:mr-[72px]">
          <div className="flex justify-between gap-1 text-[11px] text-muted sm:text-base">{axis.ticks.map((value, index) => <span key={value} className={index % 2 === 1 && index !== axis.ticks.length - 1 ? 'hidden sm:inline' : ''}>{formatAxisValue(value, metric)}</span>)}</div>
        </div> : <p className="mt-5 text-center text-sm text-muted">Chart measurements are Not Available for this period.</p>}
      </figure>
    </Card>
  )
}
