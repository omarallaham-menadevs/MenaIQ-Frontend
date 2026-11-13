import { useEffect, useRef } from 'react'
import { MoreHorizontal, X } from 'lucide-react'
import { departments } from '../../data/departments'
import { canManageDirectory, directoryPermissions, type DirectoryContext, type DirectoryUser } from '../../data/userDirectory'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import type { UserDialogMode } from './UserDialog'

export function UserDetails({ user, context, missing, onDialog, onClose }: { user: DirectoryUser | null; context: DirectoryContext; missing: boolean; onDialog: (mode: UserDialogMode) => void; onClose: () => void }) {
  const menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  if (!user) return <Card id="directory-user-details" className="min-w-0 [&]:p-6 2xl:min-h-[594px]"><EmptyState title={missing ? 'User not available in this view' : 'No user selected'} description="Select a user to inspect their department, role, and demo access." /></Card>
  const manage = canManageDirectory(context)
  const department = departments.find(value => value.id === user.departmentId)!
  function open(mode: UserDialogMode) { if (menu.current) menu.current.open = false; onDialog(mode) }
  return <Card id="directory-user-details" className="min-w-0 [&]:p-[22px] 2xl:min-h-[594px]"><div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase leading-5 text-muted">User Details</p><div className="flex items-center gap-1"><button type="button" aria-label="Deselect directory user" onClick={onClose} className="rounded p-1 text-muted hover:bg-canvas"><X size={13} aria-hidden="true" /></button><details ref={menu} className="relative" onKeyDown={event => { if (event.key === 'Escape' && menu.current?.open) { event.preventDefault(); menu.current.open = false; menu.current.querySelector('summary')?.focus() } }}><summary aria-label="User actions" className="flex cursor-pointer list-none rounded p-1 text-muted hover:bg-canvas [&::-webkit-details-marker]:hidden"><MoreHorizontal size={20} aria-hidden="true" /></summary><div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-line bg-surface p-1 shadow-sm">{[{ label: 'Edit user', kind: 'edit' as const, disabled: !manage }, { label: user.status === 'Active' ? 'Disable account' : 'Re-enable account', kind: 'status' as const, disabled: !manage }, { label: 'View local activity', kind: 'activity' as const, disabled: false }].map(action => <button key={action.kind} type="button" disabled={action.disabled} title={action.disabled ? 'Only Administrator may manage demo users' : undefined} onClick={() => open({ kind: action.kind, user })} className="block min-h-10 w-full rounded px-3 py-2 text-left text-xs hover:bg-canvas disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60">{action.label}</button>)}</div></details></div></div>
    <div className="mt-4 flex items-center gap-3"><span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-selected text-lg font-semibold text-accent">{user.name.split(' ').map(part => part[0]).slice(0,2).join('')}</span><div className="min-w-0"><h2 className="text-xl font-bold leading-7">{user.name}</h2><p className="mt-0.5 break-all text-[11px] leading-5 text-muted">{user.email}</p></div></div><div className="mt-4 flex flex-wrap gap-3"><Badge tone={user.status === 'Active' ? 'success' : 'neutral'} className="min-w-[80px] justify-center [&]:text-[11px]">{user.status}</Badge><Badge className="[&]:text-[11px]">{user.role}</Badge></div>
    <dl className="mt-5 grid grid-cols-2 gap-5 border-y border-line py-5"><div><dt className="text-[11px] leading-5 text-muted">Department</dt><dd className="mt-1 text-[13px] font-semibold leading-5">{department.homeDepartment}</dd></div><div><dt className="text-[11px] leading-5 text-muted">Data scope</dt><dd className="mt-1 text-[13px] font-semibold leading-5">{user.role === 'Department Manager' ? `${department.name} team` : 'Organization (demo)'}</dd></div></dl>
    <div className="mt-5"><h3 className="text-[10px] uppercase leading-5 text-muted">Access Overview</h3><dl className="mt-1 divide-y divide-line">{directoryPermissions(user).map(permission => <div key={permission.label} className="grid grid-cols-[minmax(0,1fr)_112px] gap-3 py-3 text-xs leading-5"><dt>{permission.label}</dt><dd className={permission.allowed ? 'font-medium text-accent' : 'text-muted'}>{permission.allowed ? 'Allowed' : 'Not allowed'}</dd></div>)}</dl></div>
    <div className="mt-4 border-t border-line pt-5"><Button variant="secondary" disabled={!manage} onClick={() => open({ kind: 'edit', user })} title={!manage ? 'User management is Administrator-only in this prototype' : 'Edit local demo role and membership'} className="w-full text-xs [&]:text-accent">Edit user permissions ↗</Button>{!manage && <p className="mt-2 text-[11px] leading-5 text-muted">Read-only: only Administrator can edit users or account status.</p>}</div>
  </Card>
}
