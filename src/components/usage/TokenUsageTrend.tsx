import { useEffect, useId, useRef, useState } from 'react'
import { formatDay } from '../../data/companyOverview'
import type { usageTrend } from '../../data/usageAndCost'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'

export function TokenUsageTrend({ days }: { days: ReturnType<typeof usageTrend> }) {
  const id = useId()
  const ref = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(1000)
  const hasMeasurements = days.some(day => day.requests > 0 && day.measuredTokens !== null)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(entries[0].contentRect.width, 240)))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasMeasurements])
  const known = days.filter(day => day.measuredTokens !== null)
  const max = Math.max(1, ...known.map(day => day.measuredTokens!)) * 1.1
  const magnitude = 10 ** Math.floor(Math.log10(max / 4))
  const step = ([1, 1.25, 1.5, 2, 2.5, 5, 10].find(value => value * magnitude >= max / 4) ?? 10) * magnitude
  const axisMax = step * 4
  const left = 58
  const right = width - 14
  const x = (index: number) => left + (right - left) * index / Math.max(days.length - 1, 1)
  const y = (value: number) => 144 - 132 * value / axisMax
  const path = days.map((day, index) => {
    if (day.measuredTokens === null) return ''
    return `${index === 0 || days[index - 1].measuredTokens === null ? 'M' : 'L'}${x(index)},${y(day.measuredTokens)}`
  }).join(' ')
  const labelIndices = [...new Set([0, Math.floor((days.length - 1) / 4), Math.floor((days.length - 1) / 2), Math.floor((days.length - 1) * 3 / 4), days.length - 1])]
  const tickLabel = (value: number) => value === 0 ? '0' : value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M` : value >= 1000 ? `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K` : String(value)

  return <Card className="min-w-0 px-6 py-3">
    <h2 className="text-[22px] font-bold leading-7 tracking-tight">Token Usage Trend</h2><p className="text-sm leading-5 text-muted">Total measured tokens over time (LiteLLM gateway only).</p>
    {!hasMeasurements ? <EmptyState title="Token measurements Not Available" description="Missing gateway measurements are not plotted as zero." /> : <svg ref={ref} role="img" aria-labelledby={`${id}-title ${id}-description`} viewBox={`0 0 ${width} 180`} preserveAspectRatio="none" className="mt-4 h-[178px] w-full overflow-visible">
      <title id={`${id}-title`}>Daily measured gateway tokens over {days.length} days</title><desc id={`${id}-description`}>{days.map(day => `${formatDay(day.date)}: ${day.measuredTokens === null ? 'Not Available' : day.measuredTokens.toLocaleString('en-US') + ' tokens'}`).join('; ')}</desc>
      {[0, 1, 2, 3, 4].map(index => <g key={index}><line x1={left} x2={right} y1={y(step * index)} y2={y(step * index)} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" /><text x={left - 14} y={y(step * index) + 4} textAnchor="end" className="fill-muted text-[13px]">{tickLabel(step * index)}</text></g>)}
      <path d={path} fill="none" className="stroke-accent" strokeWidth="2.3" vectorEffect="non-scaling-stroke" />
      {days.map((day, index) => day.measuredTokens === null ? null : <circle key={day.date} cx={x(index)} cy={y(day.measuredTokens)} r={days.length > 30 ? 2.2 : 3.2} className="fill-surface stroke-accent" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{formatDay(day.date)}: {day.measuredTokens.toLocaleString('en-US')} tokens</title></circle>)}
      {labelIndices.map((index, position) => <text key={index} x={x(index)} y="172" textAnchor="middle" className={`fill-muted text-[13px] ${position % 2 === 1 ? 'hidden sm:block' : ''}`}>{formatDay(days[index].date)}</text>)}
    </svg>}
  </Card>
}
