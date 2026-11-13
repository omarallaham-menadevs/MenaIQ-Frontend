import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, Download, Grid3X3 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { dailyActivity, parsePeriod, periods } from '../data/companyOverview'
import { departmentsCsv, getDepartments, parseDepartmentState, parseSortKey, sortDepartments, type SortKey } from '../data/departments'
import { DepartmentChart } from '../components/departments/DepartmentChart'
import { DepartmentTable } from '../components/departments/DepartmentTable'
import { DepartmentDetails } from '../components/departments/DepartmentDetails'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'

export function DepartmentsPage() {
  const [params, setParams] = useSearchParams()
  const period = parsePeriod(params.get('period'))
  const state = parseDepartmentState(params.get('state'))
  const metric = params.get('metric') === 'cost' ? 'cost' : 'tokens'
  const sortKey = parseSortKey(params.get('sort'))
  const direction = params.get('direction') === 'desc' ? 'desc' : 'asc'
  const selectedId = params.get('department')
  const [loading, setLoading] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const sourceRows = getDepartments(period, state)
  const rows = sortDepartments(sourceRows, sortKey, direction)
  const busy = loading || state === 'loading'

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(timeout)
  }, [period, state])

  function changePeriod(value: string) {
    setLoading(true)
    setExportMessage('')
    setParams(current => { const next = new URLSearchParams(current); next.set('period', value); return next })
  }

  function sortBy(key: SortKey) {
    setExportMessage('')
    setParams(current => {
      const next = new URLSearchParams(current)
      next.set('sort', key)
      next.set('direction', sortKey === key && direction === 'asc' ? 'desc' : 'asc')
      return next
    })
  }

  function departmentHref(id: string) {
    const next = new URLSearchParams(params)
    next.set('department', id)
    return `/departments?${next}`
  }

  function restoreData() {
    setLoading(true)
    setParams(current => { const next = new URLSearchParams(current); next.delete('state'); return next }, { replace: true })
  }

  function exportCsv() {
    const content = departmentsCsv(rows, period)
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `menaiq-departments-${dailyActivity.at(-period)!.date}-to-${dailyActivity.at(-1)!.date}.csv`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setExportMessage(`Exported ${rows.length} departments for the last ${period} days as CSV.`)
  }

  return (
    <div className="lg:-mt-2">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="flex items-start gap-[18px]"><div className="hidden size-[62px] shrink-0 items-center justify-center rounded-2xl bg-selected text-success sm:flex"><Grid3X3 size={29} strokeWidth={1.8} aria-hidden="true" /></div><div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Departments</h1><p className="mt-1 text-base leading-6 text-muted">Compare AI activity and usage across departments.</p></div></div>
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <div className="relative w-[208px]"><CalendarDays size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5" /><select aria-label="Department reporting period" value={period} onChange={event => changePeriod(event.target.value)} className="min-h-[46px] w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-9 pr-9 text-sm font-medium">{periods.map(value => <option key={value} value={value}>Last {value} days</option>)}</select><ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5" /></div>
          <Button variant="secondary" disabled={busy || state === 'error'} onClick={exportCsv} className="min-h-[46px] gap-2 text-base font-semibold text-success [&]:border-green-500 [&]:bg-selected/40 hover:[&]:bg-selected"><Download size={18} aria-hidden="true" />Export</Button>
        </div>
      </header>

      <div className="mt-[33px]" aria-busy={busy}>
        {busy ? <Card><LoadingState message={`Loading department activity for the last ${period} days…`} /></Card> : state === 'error' ? <Card><ErrorState title="Unable to load departments" description="The prototype could not load the selected period. Try again to restore sample data." onRetry={restoreData} /></Card> : state === 'empty' ? <Card><EmptyState title="No department activity" description="No departments are available in this reporting period." action={<Button variant="secondary" onClick={restoreData}>Show sample data</Button>} /></Card> : (
          <div className="space-y-4">
            {state === 'unavailable' && <p role="status" className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Department activity measurements are Not Available. Employee counts remain available; missing sessions, tokens, and estimated costs are not reported as zero.</p>}
            <DepartmentChart rows={sourceRows} metric={metric} onMetricChange={value => setParams(current => { const next = new URLSearchParams(current); next.set('metric', value); return next })} />
            <DepartmentTable rows={rows} sortKey={sortKey} direction={direction} onSort={sortBy} departmentHref={departmentHref} />
            <p className="text-[11px] leading-5 text-muted">Prototype data · Tokens measured via LiteLLM; costs estimated for company-provided API keys. Product and Marketing have no assigned employees in the sample roster.</p>
          </div>
        )}
      </div>
      <p role="status" className="sr-only">{exportMessage}</p>
      <DepartmentDetails selectedId={selectedId} row={sourceRows.find(row => row.id === selectedId)} period={period} onClose={() => {
        if (window.location.pathname === '/departments' && params.has('department')) setParams(current => { const next = new URLSearchParams(current); next.delete('department'); return next }, { replace: true })
      }} />
    </div>
  )
}
