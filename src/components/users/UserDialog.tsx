import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { departments } from '../../data/departments'
import { canManageDirectory, directoryRoles, type DirectoryAction, type DirectoryContext, type DirectoryResult, type DirectoryUser, type UserErrors, type UserForm } from '../../data/userDirectory'
import { trapDialogFocus } from '../../utils/trapDialogFocus'
import { Button } from '../ui/Button'

export type UserDialogMode = { kind: 'add' } | { kind: 'edit' | 'status' | 'activity'; user: DirectoryUser }
export function UserDialog({ mode, context, onAction, onDismiss }: { mode: UserDialogMode; context: DirectoryContext; onAction: (action: DirectoryAction) => DirectoryResult; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const manage = canManageDirectory(context)
  const user = mode.kind === 'add' ? null : mode.user
  useEffect(() => {
    const element = dialog.current
    const opener = document.activeElement as HTMLElement | null
    element?.showModal()
    return () => { element?.close(); if (opener?.isConnected && opener.getClientRects().length) opener.focus(); else document.querySelector<HTMLElement>('[aria-label="User actions"]')?.focus() }
  }, [])
  const title = mode.kind === 'add' ? 'Add user' : mode.kind === 'edit' ? 'Edit user' : mode.kind === 'activity' ? 'Local user activity' : `${user!.status === 'Active' ? 'Disable' : 'Re-enable'} demo account?`
  return <dialog ref={dialog} aria-labelledby="directory-dialog-title" onKeyDown={trapDialogFocus} onClose={() => { if (!dialog.current?.open) onDismiss() }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-xl overflow-y-auto rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-ink/30"><div className="flex items-center justify-between gap-4"><h2 id="directory-dialog-title" className="text-xl font-semibold">{title}</h2><button type="button" aria-label="Close user dialog" onClick={onDismiss} className="rounded p-1 hover:bg-canvas"><X size={19} aria-hidden="true" /></button></div>
    {(mode.kind === 'add' || mode.kind === 'edit') ? <UserFormFields user={user} readonly={!manage} onSave={form => onAction({ type: 'save', id: user?.id ?? null, form })} onDismiss={onDismiss} /> : mode.kind === 'activity' ? <><p className="mt-2 text-sm text-muted">{user!.name} · prototype directory events only.</p><ol className="mt-5 divide-y divide-line">{user!.activity.map(event => <li key={event.id} className="py-4"><p className="text-sm leading-6">{event.message}</p><p className="mt-2 text-xs text-muted">{event.actor} · <time dateTime={event.at}>{new Date(event.at).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</time></p></li>)}</ol></> : <><p className="mt-4 text-sm leading-6">{user!.status === 'Active' ? 'Disable' : 'Re-enable'} <strong>{user!.name}</strong> in the local demo directory? This simulation does not grant or revoke real access.</p>{!manage && <p className="mt-3 text-sm text-muted">Only the Administrator demo role may confirm this change.</p>}{error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-6 flex justify-end gap-3"><Button variant="secondary" autoFocus onClick={onDismiss}>Cancel</Button><Button disabled={!manage} onClick={() => { const result = onAction({ type: 'status', id: user!.id, expectedStatus: user!.status }); if (result.ok) onDismiss(); else setError(result.message) }}>{user!.status === 'Active' ? 'Confirm disable' : 'Confirm re-enable'}</Button></div></>}
  </dialog>
}
function UserFormFields({ user, readonly, onSave, onDismiss }: { user: DirectoryUser | null; readonly: boolean; onSave: (form: UserForm) => DirectoryResult; onDismiss: () => void }) {
  const [form, setForm] = useState<UserForm>(() => ({ name: user?.name ?? '', email: user?.email ?? '', jobTitle: user?.jobTitle ?? '', departmentId: user?.departmentId ?? 'engineering', role: user?.role ?? 'Viewer' }))
  const [errors, setErrors] = useState<UserErrors>({})
  const [message, setMessage] = useState('')
  const fieldClass = 'mt-1.5 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm disabled:bg-canvas disabled:text-muted'
  function update<K extends keyof UserForm>(key: K, value: UserForm[K]) { if (!readonly) setForm(current => ({ ...current, [key]: value })) }
  return <form noValidate onSubmit={event => {
    event.preventDefault()
    const result = onSave(form)
    if (result.ok) onDismiss()
    else { setErrors(result.errors ?? {}); setMessage(result.message); window.requestAnimationFrame(() => document.getElementById(`directory-field-${Object.keys(result.errors ?? {})[0]}`)?.focus()) }
  }}><p className="mt-2 text-xs leading-5 text-muted">Changes affect this local prototype directory only. No invitation, account provisioning, or real access changes occur.</p>{readonly && <p role="status" className="mt-3 text-sm text-muted">Your demo role is read-only for user administration.</p>}{message && <p role="alert" className="mt-4 text-sm text-danger">{message}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2">{(['name', 'email', 'jobTitle'] as const).map(key => <label key={key} className={`block text-sm font-medium ${key === 'jobTitle' ? 'sm:col-span-2' : ''}`}>{key === 'name' ? 'Name' : key === 'email' ? 'Email' : 'Job title (optional)'}<input id={`directory-field-${key}`} aria-label={key === 'name' ? 'User name' : key === 'email' ? 'User email' : 'User job title'} autoFocus={key === 'name'} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'email' ? 254 : 80} value={form[key]} disabled={readonly} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `directory-error-${key}` : undefined} onChange={event => update(key, event.target.value)} className={fieldClass} />{errors[key] && <span id={`directory-error-${key}`} className="mt-1 block text-xs text-danger">{errors[key]}</span>}</label>)}<label className="block text-sm font-medium">Department<select id="directory-field-departmentId" aria-label="User department" disabled={readonly} value={form.departmentId} aria-invalid={!!errors.departmentId} aria-describedby={errors.departmentId ? 'directory-error-departmentId' : undefined} onChange={event => update('departmentId', event.target.value as UserForm['departmentId'])} className={fieldClass}>{departments.map(department => <option key={department.id} value={department.id}>{department.homeDepartment}</option>)}</select>{errors.departmentId && <span id="directory-error-departmentId" className="mt-1 block text-xs text-danger">{errors.departmentId}</span>}</label><label className="block text-sm font-medium">Role<select id="directory-field-role" aria-label="User role" value={form.role} disabled={readonly} aria-invalid={!!errors.role} aria-describedby={errors.role ? 'directory-error-role' : undefined} onChange={event => update('role', event.target.value as UserForm['role'])} className={fieldClass}>{directoryRoles.map(role => <option key={role}>{role}</option>)}</select>{errors.role && <span id="directory-error-role" className="mt-1 block text-xs text-danger">{errors.role}</span>}</label></div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={onDismiss}>Cancel</Button><Button type="submit" disabled={readonly}>{user ? 'Save changes' : 'Add demo user'}</Button></div></form>
}
