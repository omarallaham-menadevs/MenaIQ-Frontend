import test from 'node:test'
import assert from 'node:assert/strict'
import { employees } from '../src/data/entityAnalytics.ts'
import { departments } from '../src/data/departments.ts'
import { applyDirectoryAction, createDirectory, directoryContext, directoryDepartmentRows, directoryPage, directoryPermissions, filterDirectory, validateDirectoryUser, visibleDirectory } from '../src/data/userDirectory.ts'
const admin = directoryContext(new URLSearchParams())
const at = '2026-11-13T10:00:00Z'
const form = { name: 'Demo Test User', email: 'demo.test@menaiq.example', jobTitle: 'Prototype engineer', departmentId: 'engineering', role: 'Viewer' }
test('directory reuses canonical employees once, preserving names, emails and memberships', () => {
  const users = createDirectory()
  assert.equal(users.length, employees.length)
  assert.equal(new Set(users.map(user => user.email)).size, users.length)
  for (const employee of employees) {
    const user = users.find(user => user.employeeId === employee.id)
    assert.equal(user.name, employee.name)
    assert.equal(user.email, employee.email)
    assert.equal(user.jobTitle, employee.role)
    assert.equal(departments.find(department => department.id === user.departmentId).homeDepartment, employee.department)
    assert.equal(user.status, employee.status)
  }
})
test('search, combined filters and pagination use actual scoped records', () => {
  const users = createDirectory()
  for (const query of ['maya', 'MAYA.HADDAD@MENAIQ.COM']) assert.equal(filterDirectory(users, { query, role: '', department: '', status: '' })[0].id, 'maya')
  assert.equal(filterDirectory(users, { query: '', role: 'Viewer', department: 'engineering', status: 'Active' }).length, 2)
  const six = applyDirectoryAction(users, admin, { type: 'save', id: null, form }, at).users
  assert.equal(directoryPage(six, 2).rows.length, 1)
  assert.equal(directoryPage(six, 999).page, 2)
})
test('validation rejects duplicate or invalid emails, missing names, unsupported roles and departments', () => {
  const users = createDirectory()
  assert.ok(validateDirectoryUser(users, { ...form, email: ' MAYA.HADDAD@MENAIQ.COM ' }, null).email)
  assert.ok(validateDirectoryUser(users, { ...form, email: 'broken' }, null).email)
  assert.ok(validateDirectoryUser(users, { ...form, name: ' ' }, null).name)
  assert.ok(validateDirectoryUser(users, { ...form, role: 'Owner' }, null).role)
  assert.ok(validateDirectoryUser(users, { ...form, departmentId: 'finance' }, null).departmentId)
  assert.equal(Object.keys(validateDirectoryUser(users, { ...users[0] }, users[0].id)).length, 0)
})
test('add/edit changes propagate across current directory departments without mutating historical fixtures', () => {
  const users = createDirectory()
  let result = applyDirectoryAction(users, admin, { type: 'save', id: null, form }, at)
  assert.equal(result.ok, true)
  assert.equal(result.users.at(-1).employeeId, null)
  result = applyDirectoryAction(result.users, admin, { type: 'save', id: 'maya', form: { ...users[0], departmentId: 'product', role: 'Department Manager' } }, at)
  const changed = result.users.find(user => user.id === 'maya')
  assert.equal(changed.role, 'Department Manager')
  assert.equal(changed.activity.length, 2)
  assert.equal(directoryDepartmentRows(result.users, admin).find(row => row.id === 'product').members[0].id, 'maya')
  assert.equal(users[0].departmentId, 'engineering')
  assert.equal(employees[0].department, 'Engineering')
})
test('confirmed status transitions change effective permissions; stale confirmations are rejected', () => {
  const users = createDirectory()
  let result = applyDirectoryAction(users, admin, { type: 'status', id: 'omar', expectedStatus: 'Active' }, at)
  assert.equal(result.users.find(user => user.id === 'omar').status, 'Inactive')
  assert.equal(directoryPermissions(result.users.find(user => user.id === 'omar')).some(permission => permission.allowed), false)
  assert.equal(applyDirectoryAction(result.users, admin, { type: 'status', id: 'omar', expectedStatus: 'Active' }, at).ok, false)
  result = applyDirectoryAction(result.users, admin, { type: 'status', id: 'omar', expectedStatus: 'Inactive' }, at)
  assert.equal(result.users.find(user => user.id === 'omar').status, 'Active')
})
test('Manager and Viewer cannot mutate even through direct actions; Manager cannot expand department scope', () => {
  const users = createDirectory()
  for (const role of ['viewer', 'manager']) {
    const context = directoryContext(new URLSearchParams('role=' + role + '&scope=data'))
    for (const action of [{ type: 'save', id: null, form }, { type: 'save', id: 'maya', form }, { type: 'status', id: 'maya', expectedStatus: 'Active' }]) {
      const result = applyDirectoryAction(users, context, action, at)
      assert.equal(result.ok, false)
      assert.equal(result.users, users)
    }
    if (role === 'manager') {
      assert.deepEqual(visibleDirectory(users, context).map(user => user.id), ['adam'])
      assert.equal(filterDirectory(visibleDirectory(users, context), { query: '', department: 'engineering', role: '', status: '' }).length, 0)
      assert.deepEqual(directoryDepartmentRows(users, context).map(row => row.id), ['data'])
    }
  }
})
