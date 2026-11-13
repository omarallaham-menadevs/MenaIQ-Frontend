import { employees } from './entityAnalytics.ts'
import { departments, type DepartmentId } from './departments.ts'

export const directoryRoles = ['Administrator', 'Department Manager', 'Viewer'] as const
export type DirectoryRole = typeof directoryRoles[number]
export type DirectoryUser = { id: string; employeeId: string | null; name: string; email: string; jobTitle: string; departmentId: DepartmentId; role: DirectoryRole; status: 'Active' | 'Inactive'; activity: DirectoryEvent[] }
export type DirectoryEvent = { id: string; at: string; message: string; actor: string }
export type DirectoryContext = { role: DirectoryRole; departmentId: DepartmentId }
export type UserForm = Pick<DirectoryUser, 'name' | 'email' | 'jobTitle' | 'departmentId' | 'role'>
export type UserErrors = Partial<Record<keyof UserForm, string>>
export const directoryTabs = ['Users', 'Departments', 'Roles & Permissions', 'Access Policies'] as const
export type DirectoryTab = typeof directoryTabs[number]
export const directoryPolicies = [
  { title: 'User administration', description: 'Only Administrator may add or edit directory users, change memberships or roles, and confirm account status changes.' },
  { title: 'Department scope', description: 'Department Manager can inspect users in their own department. Filters and direct user IDs cannot expand that scope. Managers cannot administer accounts.' },
  { title: 'Read-only access', description: 'Viewer may inspect directory information but cannot change users, memberships, roles, or account status.' },
  { title: 'Inactive accounts', description: 'The demo access overview marks all permissions as Not allowed for an inactive user. No real account is disabled or re-enabled.' },
] as const

export function createDirectory(): DirectoryUser[] {
  return employees.map(employee => ({ id: employee.id, employeeId: employee.id, name: employee.name, email: employee.email, jobTitle: employee.role, departmentId: departments.find(department => department.homeDepartment === employee.department)!.id, role: employee.id === 'omar' ? 'Administrator' : employee.id === 'lina' ? 'Department Manager' : 'Viewer', status: employee.status, activity: [{ id: `${employee.id}-seed`, at: '2026-11-12T15:00:00Z', actor: 'Prototype fixture', message: 'Existing employee included in the demo directory. No real account was provisioned.' }] }))
}
export function directoryContext(params: URLSearchParams): DirectoryContext {
  return { role: params.get('role') === 'viewer' ? 'Viewer' : params.get('role') === 'manager' ? 'Department Manager' : 'Administrator', departmentId: departments.find(department => department.id === params.get('scope'))?.id ?? 'engineering' }
}
export const canManageDirectory = (context: DirectoryContext) => context.role === 'Administrator'
export function visibleDirectory(users: DirectoryUser[], context: DirectoryContext) { return context.role === 'Department Manager' ? users.filter(user => user.departmentId === context.departmentId) : users }
export function directoryFilters(params: URLSearchParams) { return { query: params.get('q') ?? '', role: params.get('userRole') ?? '', department: params.get('department') ?? '', status: params.get('status') ?? '' } }
export function filterDirectory(users: DirectoryUser[], filters: ReturnType<typeof directoryFilters>) {
  const query = filters.query.trim().toLowerCase()
  return users.filter(user => (!query || [user.name, user.email, user.id, user.employeeId ?? ''].some(value => value.toLowerCase().includes(query))) && (!filters.role || user.role === filters.role) && (!filters.department || user.departmentId === filters.department) && (!filters.status || user.status === filters.status))
}
export function directoryPage<T>(rows: T[], requested: number) {
  const pageCount = Math.ceil(rows.length / 5)
  const page = Math.max(1, Math.min(Number.isFinite(requested) ? Math.floor(requested) : 1, pageCount || 1))
  const start = (page - 1) * 5
  return { rows: rows.slice(start, start + 5), total: rows.length, page, pageCount, start: rows.length ? start + 1 : 0, end: Math.min(start + 5, rows.length) }
}
export function validateDirectoryUser(users: DirectoryUser[], form: UserForm, editingId: string | null): UserErrors {
  const errors: UserErrors = {}
  if (form.name.trim().length < 2 || form.name.trim().length > 80) errors.name = 'Enter a name between 2 and 80 characters.'
  const email = form.email.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
  else if (users.some(user => user.id !== editingId && user.email.toLowerCase() === email)) errors.email = 'This email already belongs to a directory user.'
  if (!departments.some(department => department.id === form.departmentId)) errors.departmentId = 'Choose an existing department.'
  if (!directoryRoles.includes(form.role)) errors.role = 'Choose a supported demo role.'
  if (form.jobTitle.trim().length > 80) errors.jobTitle = 'Use 80 characters or fewer.'
  return errors
}
export type DirectoryAction = { type: 'save'; id: string | null; form: UserForm } | { type: 'status'; id: string; expectedStatus: DirectoryUser['status'] }
export type DirectoryResult = { ok: boolean; users: DirectoryUser[]; selectedId?: string; message: string; errors?: UserErrors }
export function applyDirectoryAction(users: DirectoryUser[], context: DirectoryContext, action: DirectoryAction, at: string): DirectoryResult {
  if (!canManageDirectory(context)) return { ok: false, users, message: `${context.role} is read-only for user administration. No changes were made.` }
  const existing = action.id ? users.find(user => user.id === action.id) : null
  if (action.id && !existing) return { ok: false, users, message: 'User no longer exists in this demo directory.' }
  if (action.type === 'save') {
    const errors = validateDirectoryUser(users, action.form, action.id)
    if (Object.keys(errors).length) return { ok: false, users, errors, message: 'Please correct the highlighted fields.' }
    let id = existing?.id ?? `demo-user-${users.length + 1}`
    while (!existing && users.some(user => user.id === id)) id += '-new'
    const changedFields = existing ? (['name', 'email', 'jobTitle', 'departmentId', 'role'] as const).filter(key => existing[key] !== action.form[key]).join(', ') : ''
    const message = existing ? `Updated local directory fields: ${changedFields || 'profile'}.` : 'Added a local demo user; no real invitation or account was created.'
    const event = { id: `${id}-event-${(existing?.activity.length ?? 0) + 1}`, at, actor: 'Omar Allahham (demo)', message }
    const updated: DirectoryUser = { id, employeeId: existing?.employeeId ?? null, ...action.form, name: action.form.name.trim(), email: action.form.email.trim().toLowerCase(), jobTitle: action.form.jobTitle.trim(), status: existing?.status ?? 'Active', activity: [...(existing?.activity ?? []), event] }
    return { ok: true, users: existing ? users.map(user => user.id === id ? updated : user) : [...users, updated], selectedId: id, message: `${updated.name}: ${existing ? 'local profile updated' : 'added to the demo directory'}. No real access was changed.` }
  }
  if (existing!.status !== action.expectedStatus) return { ok: false, users, message: 'Account status changed. Reopen the confirmation and try again.' }
  const status = existing!.status === 'Active' ? 'Inactive' : 'Active'
  const event = { id: `${existing!.id}-event-${existing!.activity.length + 1}`, at, actor: 'Omar Allahham (demo)', message: `Account ${status === 'Active' ? 're-enabled' : 'disabled'} in the local simulation only. No real access was granted or revoked.` }
  return { ok: true, users: users.map(user => user.id === existing!.id ? { ...user, status, activity: [...user.activity, event] } : user), selectedId: existing!.id, message: `${existing!.name}: demo account ${status === 'Active' ? 're-enabled' : 'disabled'}. No real access was changed.` }
}
export function directoryPermissions(user: Pick<DirectoryUser, 'role' | 'status'>) {
  const active = user.status === 'Active'
  return [ { label: 'View security findings', allowed: active }, { label: 'Review findings', allowed: active && user.role === 'Administrator' }, { label: 'View session content', allowed: active }, { label: 'Manage users', allowed: active && user.role === 'Administrator' } ]
}
export function directoryDepartmentRows(users: DirectoryUser[], context: DirectoryContext) {
  return departments.filter(department => context.role !== 'Department Manager' || department.id === context.departmentId).map(department => ({ ...department, members: users.filter(user => user.departmentId === department.id) }))
}
