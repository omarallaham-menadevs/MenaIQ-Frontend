import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { formatCost, formatTokens } from '../../data/entityAnalytics'
import type { DepartmentRow, SortDirection, SortKey } from '../../data/departments'
import { Card } from '../ui/Card'

const columns: { label: string; key: SortKey }[] = [
  { label: 'Department', key: 'name' }, { label: 'Employees', key: 'employees' },
  { label: 'Sessions', key: 'sessions' }, { label: 'Measured Tokens', key: 'measuredTokens' },
  { label: 'Estimated Cost', key: 'costCents' },
]

export function DepartmentTable({ rows, sortKey, direction, onSort, departmentHref }: { rows: DepartmentRow[]; sortKey: SortKey | null; direction: SortDirection; onSort: (key: SortKey) => void; departmentHref: (id: string) => string }) {
  const navigate = useNavigate()
  return (
    <Card className="px-6 pt-4 pb-[21px]">
      <h2 className="text-[23px] font-bold leading-8 tracking-tight">Department Statistics</h2>
      <p className="mt-0.5 text-base leading-6 text-muted">AI usage and cost by department.</p>
      <div role="region" aria-label="Department statistics, scroll horizontally on small screens" tabIndex={0} className="mt-4 overflow-x-auto rounded-lg">
        <table className="w-full min-w-[850px] table-fixed text-left text-base">
          <caption className="sr-only">Department statistics for the selected period. Select any column header to sort. Select a department to view its employees. Estimated costs are in US dollars.</caption>
          <colgroup>{['27%', '17%', '16%', '22%', '18%'].map(width => <col key={width} style={{ width }} />)}</colgroup>
          <thead className="bg-neutral"><tr>{columns.map(column => <th key={column.key} scope="col" aria-sort={sortKey === column.key ? direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="px-[18px] py-0 font-semibold"><button type="button" onClick={() => onSort(column.key)} className="group inline-flex min-h-[42px] items-center gap-2 rounded py-2 text-left" aria-label={`Sort by ${column.label}`}>
            {column.label}{sortKey === column.key ? direction === 'asc' ? <ArrowUp size={15} aria-hidden="true" /> : <ArrowDown size={15} aria-hidden="true" /> : <ArrowUpDown size={15} aria-hidden="true" className={column.key === 'name' ? '' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'} />}
          </button></th>)}</tr></thead>
          <tbody className="text-base sm:text-lg">{rows.map(row => <tr key={row.id} className="cursor-pointer border-b border-line/60 hover:bg-canvas" onClick={event => { if (!(event.target as HTMLElement).closest('a, button')) navigate(departmentHref(row.id)) }}>
            <th scope="row" className="px-[18px] py-1.5 font-medium"><Link to={departmentHref(row.id)} aria-label={`View ${row.name} department details`} className="inline-flex items-center gap-6 rounded"><span aria-hidden="true" className={`flex size-[43px] shrink-0 items-center justify-center rounded-full text-base font-semibold ${row.avatarClass}`}>{row.initials}</span>{row.name}</Link></th>
            <td className="px-[18px] py-1.5">{row.employees}</td><td className="px-[18px] py-1.5">{row.sessions?.toLocaleString('en-US') ?? 'Not Available'}</td><td className="px-[18px] py-1.5">{formatTokens(row.measuredTokens)}</td><td className="px-[18px] py-1.5">{formatCost(row.costCents)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>
  )
}
