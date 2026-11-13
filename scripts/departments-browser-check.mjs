import assert from 'node:assert/strict'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession } from './browser-session.mjs'
import { departmentsCsv, getDepartments, sortDepartments } from '../src/data/departments.ts'

const browser = await createBrowserSession()
const { evaluate, waitFor } = browser
const navigate = (query = '') => browser.navigate('/departments' + query, 'Departments')
const ready = () => waitFor(`document.querySelector('main [aria-busy]')?.getAttribute('aria-busy') === 'false'`)
const departmentNames = () => evaluate(`Array.from(document.querySelectorAll('tbody th a'), link => link.textContent.slice(2))`)
async function sort(label) {
  const before = await evaluate(`document.querySelector('[aria-label=${JSON.stringify('Sort by ' + label)}]').closest('th').getAttribute('aria-sort')`)
  await evaluate(`document.querySelector('[aria-label=${JSON.stringify('Sort by ' + label)}]').click()`)
  await waitFor(`document.querySelector('[aria-label=${JSON.stringify('Sort by ' + label)}]').closest('th').getAttribute('aria-sort') === '${before === 'ascending' ? 'descending' : 'ascending'}'`)
}
async function period(value) {
  await evaluate(`(() => { const select = document.querySelector('[aria-label="Department reporting period"]'); select.value = '${value}'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await ready()
}

try {
  await browser.viewport(1588, 991)
  await navigate()
  await ready()
  await browser.capture('departments-desktop')
  assert.deepEqual(await departmentNames(), ['Engineering', 'Product', 'Data', 'Marketing'])
  assert.equal(await evaluate(`document.querySelector('aside [aria-current="page"]').textContent`), 'Departments')
  assert.equal(await evaluate(`document.querySelector('main figure').textContent.includes('5.87M')`), true)
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="Chart metric"] button')).find(button => button.textContent === 'Cost').click()`)
  await waitFor(`document.querySelector('main h2')?.textContent === 'Estimated Cost by Department'`)
  assert.equal(await evaluate(`document.querySelector('main figure').textContent.includes('$226.10')`), true)
  assert.equal(await evaluate(`document.querySelector('[aria-pressed="true"]').textContent`), 'Cost')
  await browser.capture('departments-cost')
  await period(7)
  assert.equal(await evaluate(`document.querySelector('tbody tr').textContent.includes('5.87M')`), false)
  await period(90)
  assert.equal(await evaluate(`location.search.includes('period=90')`), true)
  await period(30)

  for (const label of ['Department', 'Employees', 'Sessions', 'Measured Tokens', 'Estimated Cost']) {
    await sort(label)
    assert.equal(await evaluate(`document.querySelector('[aria-label=${JSON.stringify('Sort by ' + label)}]').closest('th').getAttribute('aria-sort')`), 'ascending')
    await sort(label)
    assert.equal(await evaluate(`document.querySelector('[aria-label=${JSON.stringify('Sort by ' + label)}]').closest('th').getAttribute('aria-sort')`), 'descending')
  }
  await sort('Department')
  assert.deepEqual(await departmentNames(), ['Data', 'Engineering', 'Marketing', 'Product'])

  const downloadPath = path.resolve('.browser-qa', 'departments-downloads-' + Date.now())
  await mkdir(downloadPath, { recursive: true })
  await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath }, false)
  await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes('Export')).click()`)
  let csvFile
  for (let attempt = 0; attempt < 100; attempt++) {
    csvFile = (await readdir(downloadPath)).find(name => name.endsWith('.csv'))
    if (csvFile) break
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  assert.ok(csvFile, 'Export must download a real CSV file')
  assert.equal(await readFile(path.join(downloadPath, csvFile), 'utf8'), departmentsCsv(sortDepartments(getDepartments(30), 'name', 'asc'), 30))
  assert.equal(csvFile, 'menaiq-departments-2026-10-14-to-2026-11-12.csv')

  await period(7)
  await evaluate(`document.querySelector('[aria-label="View Engineering department details"]').focus(); document.querySelector('[aria-label="View Engineering department details"]').click()`)
  await waitFor(`document.querySelector('dialog[open]')?.textContent.includes('Maya Haddad')`)
  await browser.capture('departments-details')
  await browser.key('Escape', 27)
  await waitFor(`!document.querySelector('dialog[open]') && !location.search.includes('department=')`)
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`), 'View Engineering department details')
  await evaluate(`document.querySelector('[aria-label="View Engineering department details"]').click()`)
  await waitFor(`!!document.querySelector('dialog[open]')`)
  await evaluate(`Array.from(document.querySelectorAll('dialog[open] a')).find(link => link.textContent.includes('Maya Haddad')).click()`)
  await waitFor(`document.querySelector('h1')?.textContent === 'Entity Analytics'`)
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('entity')`), 'maya')
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('period')`), '7')

  await navigate('?department=product')
  await waitFor(`document.querySelector('dialog[open]')?.textContent.includes('No employees assigned')`)
  await evaluate(`document.querySelector('[aria-label="Close department details"]').click()`)
  await waitFor(`!document.querySelector('dialog[open]')`)

  for (const [state, text] of [['loading', 'Loading department activity'], ['empty', 'No department activity'], ['error', 'Unable to load departments'], ['unavailable', 'Department activity measurements are Not Available']]) {
    await navigate('?state=' + state)
    await waitFor(`document.querySelector('main')?.textContent.includes(${JSON.stringify(text)})`)
    await browser.capture('departments-state-' + state)
    if (state === 'loading' || state === 'error') assert.equal(await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes('Export')).disabled`), true)
    if (state === 'empty' || state === 'error') {
      await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => /Try again|Show sample data/.test(button.textContent)).click()`)
      await waitFor(`document.querySelectorAll('tbody tr').length === 4 && !location.search.includes('state=')`)
    }
  }
  assert.equal(await evaluate(`document.querySelector('tbody').textContent.includes('Not Available')`), true)

  await browser.viewport(390, 844)
  await navigate()
  await ready()
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Mobile page must not overflow')
  await browser.capture('departments-mobile')
  await browser.viewport(1588, 991)
  for (const [route, title, beforeFile, afterName] of [
    ['/company-overview', 'Company Overview', 'company-before-departments.png', 'company-after-departments'],
    ['/entity-analytics', 'Entity Analytics', 'entity-before-departments.png', 'entity-after-departments'],
  ]) {
    await browser.navigate(route, title)
    await waitFor(`!!document.querySelector('tbody')`)
    await browser.capture(afterName)
    assert.equal((await readFile('.browser-qa/' + beforeFile)).equals(await readFile('.browser-qa/' + afterName + '.png')), true, title + ' must remain visually byte-identical')
  }
  assert.deepEqual(browser.errors, [], 'No browser runtime or resource errors')
  console.log('Departments browser checks passed: dates, Tokens/Cost, all sort columns and directions, downloaded CSV content, department/member navigation, empty/error recovery, unavailable values and mobile layout. Both approved page screenshots are byte-identical.')
} catch (error) {
  console.error(await evaluate(`JSON.stringify({ url: location.href, title: document.querySelector('h1')?.textContent, dialog: document.querySelector('dialog[open]')?.textContent })`))
  console.error(browser.errors)
  await browser.capture('departments-check-failure')
  throw error
} finally {
  await browser.close()
}
