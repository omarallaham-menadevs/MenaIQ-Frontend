import { useEffect, useId, useRef, useState } from 'react'
import { formatDay, type DailyActivity, type Period } from '../../data/companyOverview'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

export function SessionTrend({ days, period }: { days: DailyActivity[]; period: Period }) {
  const id = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(800)
  useEffect(() => {
    const element = svgRef.current
    if (!element) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(entries[0].contentRect.width, 200)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const left = 42
  const right = width - 25
  const top = 14
  const bottom = 176
  const maxValue = Math.ceil(Math.max(...days.map(day => day.sessions)) / 20) * 20
  const x = (index: number) => left + index * (right - left) / Math.max(days.length - 1, 1)
  const y = (value: number) => bottom - value * (bottom - top) / maxValue
  const points = days.map((day, index) => `${x(index)},${y(day.sessions)}`).join(' ')
  const labelIndices = [0, Math.floor((days.length - 1) / 2), days.length - 1]

  return (
    <Card className="min-w-0 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[22px] font-bold leading-7 tracking-tight">Session Trend</h2>
          <p className="mt-1 text-[13px] text-muted">Sessions captured over the last {period} days</p>
        </div>
        <Badge className="mt-0.5 text-[11px]">Daily observations</Badge>
      </div>
      <svg ref={svgRef} role="img" aria-labelledby={`${id}-title ${id}-description`} viewBox={`0 0 ${width} 188`} className="mt-6 h-[176px] w-full overflow-visible" preserveAspectRatio="none">
        <title id={`${id}-title`}>Daily sessions over the last {period} days</title>
        <desc id={`${id}-description`}>{days.map(day => `${formatDay(day.date)}: ${day.sessions} sessions`).join('; ')}</desc>
        {[1, 2, 3, 4].map(step => {
          const value = maxValue * step / 4
          return <g key={step}>
            <line x1={left} x2={right} y1={y(value)} y2={y(value)} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x="0" y={y(value) + 4} className="fill-muted text-[13px]">{value}</text>
          </g>
        })}
        <polyline points={points} fill="none" className="stroke-chart" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {days.map((day, index) => <circle key={day.date} cx={x(index)} cy={y(day.sessions)} r={period === 90 ? 2.3 : 3.6} className="fill-surface stroke-chart" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{formatDay(day.date)}: {day.sessions} sessions</title></circle>)}
        {labelIndices.map((index, position) => <text key={index} x={x(index)} y="182" textAnchor={position === 0 ? 'start' : position === 2 ? 'end' : 'middle'} className="fill-muted text-[13px]">{formatDay(days[index].date)}</text>)}
      </svg>
    </Card>
  )
}
