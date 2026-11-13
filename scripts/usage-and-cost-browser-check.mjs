import assert from 'node:assert/strict'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession } from './browser-session.mjs'
import { filterUsageRequests, modelUsage, modelUsageCsv, parseUsageFilters, sortModelUsage, sortUsageRequests, usageRequestsCsv } from '../src/data/usageAndCost.ts'

const browser = await createBrowserSession()
const { evaluate, waitFor } = browser
const navigate = (query = '') => browser.navigate('/usage-cost' + query, 'Usage & Cost')
const ready = () => waitFor(`document.querySelector('#usage-content')?.getAttribute('aria-busy') === 'false'`)
async function select(label, value) {
  await evaluate(`(() => { const control = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); control.value = ${JSON.stringify(value)}; control.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`)
  const key = { 'Usage employee filter': 'employee', 'Usage department filter': 'department', 'Usage model filter': 'model', 'Usage reporting period': 'period' }[label]
  await waitFor(`new URLSearchParams(location.search).get(${JSON.stringify(key)}) === ${JSON.stringify(value)}`)
  await ready()
}
async function tab(name) {
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="Usage views"] button')).find(button => button.textContent === ${JSON.stringify(name)}).click()`)
  await waitFor(`document.querySelector('[aria-label="Usage views"] [aria-selected="true"]')?.textContent === ${JSON.stringify(name)}`)
}
async function download(expected, suffix) {
  const directory = path.resolve('.browser-qa', 'usage-download-' + suffix + '-' + Date.now())
  await mkdir(directory, { recursive: true })
  await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: directory }, false)
  await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes('Export')).click()`)
  let file
  for (let attempt = 0; attempt < 100; attempt++) {
    file = (await readdir(directory)).find(name => name.endsWith('.csv'))
    if (file) break
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  assert.ok(file, 'Export must create a real CSV')
  assert.equal(await readFile(path.join(directory, file), 'utf8'), expected)
}

try {
  await browser.viewport(1588, 991)
  await navigate()
  await ready()
  assert.equal(await evaluate(`document.querySelector('[aria-label="Usage summary"]').textContent.includes('8.42M')`), true)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Usage summary"]').textContent.includes('5,382')`), true)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Usage summary"]').textContent.includes('$318.40')`), true)
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 4)
  assert.equal(await evaluate(`document.querySelectorAll('thead th').length`), 7)
  assert.equal(await evaluate(`document.querySelector('tbody tr:last-child').textContent.includes('Not Available')`), true)
  await browser.capture('usage-and-cost-desktop')
  await evaluate(`document.querySelector('[role="switch"]').click()`)
  await waitFor(`document.querySelectorAll('thead th').length === 4`)
  assert.equal(await evaluate(`document.querySelector('[role="switch"]').getAttribute('aria-checked')`), 'false')
  await evaluate(`document.querySelector('[role="switch"]').click()`)
  await waitFor(`document.querySelectorAll('thead th').length === 7`)
  await evaluate(`document.querySelector('[aria-label="Sort models by Requests"]').click()`)
  await waitFor(`document.querySelector('[aria-label="Sort models by Requests"]').closest('th').getAttribute('aria-sort') === 'ascending'`)
  await evaluate(`document.querySelector('[aria-label="Sort models by Requests"]').click()`)
  await waitFor(`document.querySelector('[aria-label="Sort models by Requests"]').closest('th').getAttribute('aria-sort') === 'descending'`)
  const defaultRecords = filterUsageRequests(parseUsageFilters(new URLSearchParams()))
  await download(modelUsageCsv(sortModelUsage(modelUsage(defaultRecords), 'requests', true), 30, true), 'models')

  await select('Usage employee filter', 'maya')
  await waitFor(`document.querySelector('[aria-label="Usage summary"]').textContent.includes('2.41M')`)
  await select('Usage department filter', 'engineering')
  await select('Usage model filter', 'gpt-4o')
  await waitFor(`document.querySelectorAll('tbody tr').length === 1`)
  assert.equal(await evaluate(`document.querySelector('tbody').textContent.includes('100.0%')`), true)
  const oldDescription = await evaluate(`document.querySelector('svg[role="img"] desc').textContent`)
  await select('Usage reporting period', '7')
  await waitFor(`document.querySelector('svg[role="img"] title')?.textContent.includes('7 days')`)
  assert.notEqual(await evaluate(`document.querySelector('svg[role="img"] desc').textContent`), oldDescription)
  await select('Usage reporting period', '90')
  await waitFor(`document.querySelectorAll('svg[role="img"] circle').length === 90`)

  await navigate()
  await select('Usage model filter', 'gpt-4o-mini')
  await waitFor(`document.querySelector('[aria-label="Usage summary"]').textContent.includes('No company-key cost basis available')`)
  assert.equal(await evaluate(`document.querySelector('tbody').textContent.includes('$0.00')`), false)
  await browser.capture('usage-unpriced-model')
  await tab('Model Requests')
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 10)
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('tbody tr')).every(row => row.textContent.includes('Not Available'))`), true)
  const mini = sortUsageRequests(filterUsageRequests(parseUsageFilters(new URLSearchParams('model=gpt-4o-mini'))), 'timestamp', true)
  await download(usageRequestsCsv(mini), 'requests')
  await evaluate(`document.querySelector('[aria-label="Next request page"]').click()`)
  await waitFor(`document.querySelector('[aria-label="Request page 2"]')?.getAttribute('aria-current') === 'page'`)
  await evaluate(`document.querySelector('tbody a').click()`)
  await waitFor(`document.querySelector('h1')?.textContent === 'Sessions' && !!document.querySelector('#session-detail-panel h2')`)

  await navigate()
  await evaluate(`document.querySelector('[aria-controls="usage-more-filters"]').click()`)
  await waitFor(`!!document.querySelector('#usage-more-filters')`)
  assert.equal(await evaluate(`document.querySelector('#usage-more-filters').contains(document.activeElement)`), true)
  await evaluate(`(() => { const controls = document.querySelectorAll('#usage-more-filters select'); const values = ['Claude Code', 'web-platform', 'available', 'Success']; controls.forEach((control, index) => { control.value = values[index]; control.dispatchEvent(new Event('change', { bubbles: true })); }); })()`)
  await evaluate(`document.querySelector('#usage-more-filters').requestSubmit()`)
  await waitFor(`!document.querySelector('#usage-more-filters') && location.search.includes('costAvailability=available')`)
  await tab('Model Requests')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('tbody tr')).every(row => row.textContent.includes('Maya Haddad') && row.textContent.includes('Success'))`), true)
  await evaluate(`document.querySelector('[aria-controls="usage-more-filters"]').click()`)
  await waitFor(`!!document.querySelector('#usage-more-filters')`)
  await browser.key('Escape', 27)
  await waitFor(`!document.querySelector('#usage-more-filters')`)
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-controls')`), 'usage-more-filters')

  await navigate('?tab=Model+Requests')
  await evaluate(`document.querySelector('[aria-label="Request page 539"]').click()`)
  await waitFor(`document.querySelectorAll('tbody tr').length === 2`)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Next request page"]').disabled`), true)
  await evaluate(`document.querySelector('[aria-label="Sort requests by Measured Tokens"]').click()`)
  await waitFor(`document.querySelector('[aria-label="Sort requests by Measured Tokens"]').closest('th').getAttribute('aria-sort') === 'ascending'`)
  await navigate()
  await evaluate(`document.querySelector('[aria-label="Usage views"] button').focus()`)
  await browser.key('ArrowRight', 39)
  await waitFor(`document.querySelector('[aria-label="Usage views"] [aria-selected="true"]')?.textContent === 'Model Requests'`)
  await browser.key('Home', 36)
  await waitFor(`document.querySelector('[aria-label="Usage views"] [aria-selected="true"]')?.textContent === 'Overview'`)

  for (const [state, text] of [['loading', 'Loading gateway usage'], ['empty', 'No gateway requests found'], ['error', 'Unable to load usage records'], ['unavailable', 'Token measurements and cost estimates are Not Available']]) {
    await navigate('?state=' + state)
    await waitFor(`document.querySelector('main')?.textContent.includes(${JSON.stringify(text)})`)
    await browser.capture('usage-state-' + state)
    if (state === 'empty' || state === 'error') {
      await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => /Try again|Reset filters/.test(button.textContent)).click()`)
      await waitFor(`document.querySelectorAll('tbody tr').length === 4`)
    }
  }
  assert.equal(await evaluate(`document.querySelector('[aria-label="Usage summary"]').textContent.includes('$0.00')`), false)
  assert.equal(await evaluate(`!!document.querySelector('svg[role="img"]')`), false)
  await navigate('?employee=noor')
  await waitFor(`document.querySelector('main').textContent.includes('No gateway requests found')`)
  await browser.viewport(390, 844)
  await navigate()
  await ready()
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Usage Overview must not overflow on mobile')
  await browser.capture('usage-and-cost-mobile')
  await tab('Model Requests')
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Request table must not overflow the mobile page')
  await browser.capture('usage-requests-mobile')

  await browser.viewport(1588, 991)
  for (const [route, title, before, after] of [
    ['/company-overview', 'Company Overview', 'company-before-usage.png', 'company-after-usage'],
    ['/entity-analytics', 'Entity Analytics', 'entity-before-usage.png', 'entity-after-usage'],
    ['/departments', 'Departments', 'departments-before-usage.png', 'departments-after-usage'],
    ['/sessions', 'Sessions', 'sessions-before-usage.png', 'sessions-after-usage'],
    ['/code-traceability', 'Code Traceability', 'trace-before-usage.png', 'trace-after-usage'],
  ]) {
    await browser.navigate(route, title)
    await waitFor(`!!document.querySelector('tbody')`)
    await browser.capture(after)
    assert.equal((await readFile('.browser-qa/' + before)).equals(await readFile('.browser-qa/' + after + '.png')), true, title + ' must remain visually byte-identical')
  }
  assert.deepEqual(browser.errors, [], 'No browser runtime or resource errors')
  console.log('Usage browser checks passed: all filters, chart, tabs, percentages, sorting, actual CSV downloads, requests pagination/session navigation, unavailable values, states and mobile layout. All five previous page screenshots are byte-identical.')
} catch (error) {
  console.error(await evaluate(`JSON.stringify({ url: location.href, heading: document.querySelector('h1')?.textContent })`))
  console.error(browser.errors)
  await browser.capture('usage-check-failure')
  throw error
} finally { await browser.close() }
