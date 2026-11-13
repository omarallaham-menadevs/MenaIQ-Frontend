import type { KeyboardEvent, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { formatActivity } from '../../data/companyOverview'
import { authorName, publicGitHubExample, traceRowId, type DemoCommit, type DemoPullRequest, type DemoReview, type filterRepositories, type tracePage, type TraceTab } from '../../data/traceability'
import { getPaginationItems } from '../../data/sessions'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'

export type TraceRow = DemoCommit | DemoPullRequest | DemoReview | ReturnType<typeof filterRepositories>[number]

export function TraceTable({ tab, result, selectedId, onSelect, onPage, onReset }: { tab: TraceTab; result: ReturnType<typeof tracePage<TraceRow>>; selectedId: string | null; onSelect: (id: string) => void; onPage: (page: number) => void; onReset: () => void }) {
  const headers = tab === 'Commits' ? ['Commit ID', 'Message', 'Repository', 'Time'] : tab === 'Pull Requests' ? ['Pull Request', 'Title', 'Repository', 'State'] : tab === 'Reviews' ? ['Review', 'Reviewer', 'Pull Request', 'State'] : ['Repository', 'Commits', 'Pull Requests', 'Reviews']
  function keyNavigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowDown' ? Math.min(index + 1, result.rows.length - 1) : event.key === 'ArrowUp' ? Math.max(index - 1, 0) : event.key === 'Home' ? 0 : event.key === 'End' ? result.rows.length - 1 : null
    if (next === null) return
    event.preventDefault()
    onSelect(traceRowId(result.rows[next]))
    document.getElementById(`trace-row-${next}`)?.focus()
  }
  return <Card className="flex min-w-0 flex-col py-4 2xl:min-h-[655px]">
    <h2 className="mb-[18px] text-[24px] font-bold leading-8 tracking-tight">{tab} ({result.total.toLocaleString('en-US')})</h2>
    {result.total === 0 ? <EmptyState title={`No ${tab.toLowerCase()} found`} description="No demo records match this period and the active filters." action={<Button variant="secondary" onClick={onReset}>Reset filters</Button>} /> : <div role="region" aria-label={`${tab} table, scroll horizontally on small screens`} tabIndex={0} className="overflow-x-auto rounded-lg">
      <table className="w-full min-w-[660px] table-fixed text-left text-sm"><caption className="sr-only">Demo {tab.toLowerCase()} in the selected reporting period. Select a row to inspect details. External icons open public example history, not these synthetic commits. Times are UTC.</caption>
        <colgroup>{(tab === 'Commits' ? ['18%', '42%', '23%', '17%'] : ['22%', '35%', '24%', '19%']).map(width => <col key={width} style={{ width }} />)}</colgroup>
        <thead className="bg-neutral"><tr>{headers.map(header => <th key={header} scope="col" className="px-2.5 py-2 font-semibold">{header}</th>)}</tr></thead>
        <tbody className="text-[15px]">{result.rows.map((row, index) => {
          const id = traceRowId(row)
          const selected = id === selectedId
          const commit = 'sha' in row ? row : null
          const pr = 'commitShas' in row ? row : null
          const review = 'reviewerId' in row ? row : null
          const repository = 'connected' in row ? row : null
          return <tr key={id} className={`h-[46px] cursor-pointer border-b border-line/50 ${selected ? 'bg-selected' : 'hover:bg-canvas'}`} onClick={event => { if (!(event.target as HTMLElement).closest('button,a')) onSelect(id) }}>
            <th scope="row" className="px-2.5 py-2 text-left font-semibold"><div className="flex items-center gap-1.5"><button type="button" id={`trace-row-${index}`} data-trace-id={id} aria-label={`Select ${tab === 'Commits' ? 'commit ' + commit!.shortSha : tab === 'Pull Requests' ? 'pull request ' + id : tab === 'Reviews' ? 'review ' + id : 'repository ' + id}`} aria-pressed={selected} aria-controls="trace-detail-pane" onClick={() => onSelect(id)} onKeyDown={event => keyNavigate(event, index)} className={`min-w-0 truncate rounded py-0.5 text-left ${selected ? 'text-success' : 'hover:text-accent'}`}>{commit?.shortSha ?? (pr ? `#${pr.id}` : id)}</button>{commit && <ExampleLink />}</div></th>
            <td className="truncate px-2.5 py-2" title={commit?.message ?? pr?.title}>{commit?.message ?? pr?.title ?? (review ? authorName(review.reviewerId) : repository!.commits.length)}</td>
            <td className="truncate px-2.5 py-2">{commit?.repository ?? pr?.repository ?? (review ? `#${review.pullRequestId}` : repository!.pullRequests.length)}</td>
            <td className="whitespace-nowrap px-2.5 py-2 text-sm">{commit ? <time dateTime={commit.committedAt} title="UTC">{formatActivity(commit.committedAt)}</time> : pr ? <TraceState>{pr.state}</TraceState> : review ? <TraceState>{review.state}</TraceState> : repository!.reviews.length}</td>
          </tr>
        })}</tbody>
      </table>
    </div>}
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-8 text-base"><p role="status">{result.start}–{result.end} of {result.total.toLocaleString('en-US')}</p>{result.pageCount > 1 && <nav aria-label="Traceability pagination" className="flex gap-1.5"><button type="button" aria-label="Previous trace page" disabled={result.page === 1} onClick={() => onPage(result.page - 1)} className="flex size-9 items-center justify-center rounded-lg border border-line disabled:opacity-40"><ChevronLeft size={16} aria-hidden="true" /></button>{getPaginationItems(result.page, result.pageCount).map((page, index) => page === 'ellipsis' ? <span key={`gap-${index}`} className="px-2">…</span> : <button type="button" key={page} aria-label={`Trace page ${page}`} aria-current={result.page === page ? 'page' : undefined} onClick={() => onPage(page)} className={`min-h-9 min-w-9 rounded-lg px-2 ${result.page === page ? 'bg-success-soft font-semibold text-success' : 'hover:bg-neutral'}`}>{page}</button>)}<button type="button" aria-label="Next trace page" disabled={result.page === result.pageCount} onClick={() => onPage(result.page + 1)} className="flex size-9 items-center justify-center rounded-lg border border-line disabled:opacity-40"><ChevronRight size={16} aria-hidden="true" /></button></nav>}</div>
  </Card>
}

export function ExampleLink() {
  return <a href={publicGitHubExample} target="_blank" rel="noopener noreferrer" aria-label="Open public GitHub example history, not this synthetic commit" title="Public example history only. This synthetic SHA is not hosted on GitHub." className="shrink-0 rounded hover:text-accent"><ExternalLink size={15} aria-hidden="true" /></a>
}
export function TraceState({ children, demo = false }: { children: ReactNode; demo?: boolean }) {
  const value = String(children)
  return <Badge tone={['Merged', 'Verified', 'Approved'].includes(value) ? 'success' : ['Unverified', 'Open', 'Changes Requested', 'Commented'].includes(value) ? 'warning' : 'neutral'} className="max-w-full whitespace-normal text-xs">{children}{demo ? ' (demo)' : ''}</Badge>
}
