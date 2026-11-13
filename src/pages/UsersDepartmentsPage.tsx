import { useState, type KeyboardEvent } from 'react'
import { Info, Plus, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { departments } from '../data/departments'
import { applyDirectoryAction, canManageDirectory, createDirectory, directoryContext, directoryFilters, directoryPage, directoryTabs, filterDirectory, visibleDirectory, type DirectoryAction, type DirectoryTab } from '../data/userDirectory'
import { DirectoryFilters } from '../components/users/DirectoryFilters'
import { DirectoryTable } from '../components/users/DirectoryTable'
import { UserDetails } from '../components/users/UserDetails'
import { UserDialog, type UserDialogMode } from '../components/users/UserDialog'
import { DepartmentDetails, DepartmentDirectory, DirectoryPolicies, DirectoryRoleMatrix } from '../components/users/DirectoryViews'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'

export function UsersDepartmentsPage() {
  const [params, setParams] = useSearchParams()
  const [users, setUsers] = useState(createDirectory)
  const [mode, setMode] = useState<UserDialogMode | null>(null)
  const [feedback, setFeedback] = useState('')
  const context = directoryContext(params)
  const manage = canManageDirectory(context)
  const tab = directoryTabs.find(value => value === params.get('tab')) ?? 'Users'
  const state = params.get('state') ?? 'ready'
  const filters = directoryFilters(params)
  const scoped = state === 'empty' ? [] : visibleDirectory(users, context)
  const rows = filterDirectory(scoped, filters)
  const selectedId = params.get('user') ?? rows[0]?.id ?? 'none'
  const selectedIndex = rows.findIndex(user => user.id === selectedId)
  const result = directoryPage(rows, Number(params.get('page') ?? Math.floor(Math.max(0, selectedIndex) / 5) + 1))
  const busy = state === 'loading'
  const selected = busy || state === 'error' ? null : scoped.find(user => user.id === selectedId) ?? null
  const departmentId = params.get('selectedDepartment') ?? context.departmentId
  function update(values: Record<string, string>, replace = false) {
    setParams(() => { const next = new URLSearchParams(window.location.search); for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key) } return next }, { replace })
  }
  function filter(values: Record<string, string>) { update({ ...values, user: '', page: '' }, 'q' in values) }
  function changeTab(value: DirectoryTab) { update({ tab: value, page: '', q: '' }) }
  function tabKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % directoryTabs.length : event.key === 'ArrowLeft' ? (index + directoryTabs.length - 1) % directoryTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? directoryTabs.length - 1 : null
    if (next === null) return
    event.preventDefault(); changeTab(directoryTabs[next]); document.getElementById(`directory-tab-${next}`)?.focus()
  }
  function action(value: DirectoryAction) {
    const freshContext = directoryContext(new URLSearchParams(window.location.search))
    const result = applyDirectoryAction(users, freshContext, value, new Date().toISOString())
    setFeedback(result.message)
    if (result.ok) { setUsers(result.users); update({ user: result.selectedId ?? '', q: '', userRole: '', department: '', status: '', page: '', state: '' }) }
    return result
  }
  function reset() { update({ q: '', userRole: '', department: '', status: '', user: '', page: '', state: '' }) }
  function openDialog(value: UserDialogMode) { setFeedback(''); setMode(value) }
  const descriptions = { Users: 'Manage access and membership', Departments: 'Review department memberships in the current demo directory', 'Roles & Permissions': 'Review permission defaults and department scopes', 'Access Policies': 'Understand prototype access rules and limitations' }
  return <div className="lg:-mt-1">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="flex items-start gap-[18px]"><div className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-selected text-accent sm:flex"><Users size={19} strokeWidth={1.6} aria-hidden="true" /></div><div><h1 className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px]">Users &amp; Departments</h1><p className="mt-1 text-[13px] leading-5 text-muted">Manage people, department assignments, and access permissions.</p></div></div><Button disabled={!manage || busy || state === 'error'} onClick={() => openDialog({ kind: 'add' })} title={!manage ? 'Only Administrator may add users' : 'Add a local demo user'} className="min-h-11 min-w-[153px] text-xs"><Plus size={14} aria-hidden="true" />Add User</Button></header>
    <div className="mt-9"><p className="text-[9px] font-medium uppercase leading-5 text-muted">Administration</p><div role="tablist" aria-label="Administration views" className="mt-1 flex overflow-x-auto border-b border-line">{directoryTabs.map((value, index) => <button key={value} type="button" id={`directory-tab-${index}`} role="tab" aria-selected={tab === value} aria-controls="directory-content" tabIndex={tab === value ? 0 : -1} onClick={() => changeTab(value)} onKeyDown={event => tabKeys(event,index)} className={`relative min-h-11 shrink-0 px-0 text-left text-sm ${index === 0 ? 'w-[104px]' : index === 1 ? 'w-[159px]' : index === 2 ? 'w-[224px]' : 'w-[180px]'} ${tab === value ? 'font-semibold text-accent after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-20 after:bg-accent' : 'text-muted hover:text-ink'}`}>{value}</button>)}</div></div>
    {!manage && <p role="status" className="mt-4 rounded-lg bg-selected/50 px-4 py-3 text-xs leading-5 text-muted">{context.role} demo: read-only user administration.{context.role === 'Department Manager' ? ` Only ${departments.find(value => value.id === context.departmentId)!.homeDepartment} users are visible.` : ' User edits, role changes, and account status changes are disabled.'} This preview is not authentication.</p>}
    {feedback && <p role="status" className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-xs leading-5 text-accent">{feedback}</p>}
    <div id="directory-content" role="tabpanel" aria-labelledby={`directory-tab-${directoryTabs.indexOf(tab)}`} tabIndex={0} className="mt-7 grid items-start gap-4 rounded-xl 2xl:grid-cols-[minmax(0,1.91fr)_minmax(0,1fr)]">
      <Card className="flex min-w-0 flex-col [&]:p-[22px] 2xl:min-h-[720px]"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold leading-7">{tab}</h2>{tab === 'Users' && <Badge className="min-w-[98px] justify-center [&]:text-[11px]">{rows.length} users</Badge>}</div><p className="mt-1.5 text-xs leading-5 text-muted">{descriptions[tab]}</p>
      {tab === 'Users' && <div className="mb-[22px] mt-7"><DirectoryFilters filters={filters} context={context} onFilter={filter} /></div>}
      {busy ? <LoadingState message="Loading directory…" /> : state === 'error' ? <ErrorState title="Unable to load directory" description="The local prototype directory could not be loaded. Try again to restore demo records." onRetry={() => update({ state: '' })} /> : tab === 'Users' ? rows.length ? <DirectoryTable result={result} selectedId={selected?.id ?? null} onSelect={user => update({ user, page: String(result.page) })} onPage={page => update({ page: String(page), user: 'none' })} /> : <EmptyState title="No users found" description="No demo users match the selected search and filters." action={<Button variant="secondary" onClick={reset}>Reset filters</Button>} /> : tab === 'Departments' ? <DepartmentDirectory users={scoped} context={context} query={filters.query} selectedId={departmentId} onSearch={q => update({ q }, true)} onSelect={selectedDepartment => update({ selectedDepartment })} /> : tab === 'Roles & Permissions' ? <DirectoryRoleMatrix /> : <DirectoryPolicies />}
      </Card>
      <div className="min-w-0 space-y-5">{tab === 'Departments' && !busy && state !== 'error' ? <DepartmentDetails users={scoped} context={context} selectedId={departmentId} onUser={user => update({ tab: 'Users', user, q: '', userRole: '', department: '', status: '', page: '' })} /> : <UserDetails key={selected?.id ?? 'none'} user={selected} context={context} missing={!busy && state !== 'error' && params.has('user') && selectedId !== 'none' && !selected} onDialog={openDialog} onClose={() => { update({ user: 'none' }); document.getElementById(`directory-row-${selected?.id}`)?.focus() }} />}<div className="rounded-xl bg-[#F0F5F2] px-5 py-4"><p className="flex items-center gap-2 text-[13px] font-medium"><Info size={13} aria-hidden="true" className="shrink-0" />Access is permission-based</p><p className="mt-2 text-xs leading-6 text-muted">Roles provide defaults. Individual permissions and team scope determine which data and actions are available.</p></div></div>
    </div><p className="mt-3 text-[10px] leading-5 text-muted">Prototype directory changes are local to this page and reset on reload. Historical analytics remain fixed demo snapshots. No real access is changed.</p>
    {mode && <UserDialog mode={mode} context={context} onAction={action} onDismiss={() => setMode(null)} />}
  </div>
}
