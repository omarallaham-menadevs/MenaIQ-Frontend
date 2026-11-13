import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createBrowserSession } from './browser-session.mjs'
import { entitySessions } from '../src/data/entityAnalytics.ts'

const browser = await createBrowserSession()
const { evaluate, waitFor } = browser
const navigate = (query = '') => browser.navigate('/sessions' + query, 'Sessions')
const ready = () => waitFor(`document.querySelector('main [aria-busy]')?.getAttribute('aria-busy') === 'false'`)
async function select(label, value) {
  await evaluate(`(() => { const control = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); control.value = ${JSON.stringify(value)}; control.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`)
}
async function search(value) {
  await evaluate(`(() => { const input = document.querySelector('[aria-label="Search sessions"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await waitFor(`new URLSearchParams(location.search).get('q') === ${JSON.stringify(value)}`)
}
async function clickSession(id) {
  await evaluate(`(() => { const button = document.querySelector('[aria-label=${JSON.stringify('View session ' + id)}]'); button.focus(); button.click(); })()`)
  await waitFor(`document.querySelector('#session-detail-panel h2')?.textContent === ${JSON.stringify(id)}`)
}

try {
  await browser.viewport(1588, 991)
  await navigate()
  await ready()
  assert.equal(await evaluate(`document.querySelector('main h2').textContent`), 'Sessions (1,284)')
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 10)
  assert.equal(await evaluate(`document.querySelector('#session-detail-panel h2').textContent`), 'SES-1082')
  assert.equal(await evaluate(`document.querySelector('tbody [aria-pressed="true"]').textContent`), 'SES-1082')
  await browser.capture('sessions-desktop')
  await clickSession('SES-1084')
  assert.equal(await evaluate(`document.querySelector('#session-detail-panel').textContent.includes('Maya Haddad')`), true)
  await browser.key('ArrowDown', 40)
  await waitFor(`document.querySelector('#session-detail-panel h2')?.textContent === 'SES-1083'`)
  for (const [tab, text] of [['Tool Calls', 'file_write'], ['Files', 'src/routes/invoices.ts'], ['Prompts', 'Sanitized demo summaries'], ['Timeline', 'Session Started']]) {
    await evaluate(`Array.from(document.querySelectorAll('[role="tab"]')).find(tab => tab.textContent === ${JSON.stringify(tab)}).click()`)
    await waitFor(`document.querySelector('#session-investigation-panel')?.textContent.includes(${JSON.stringify(text)})`)
    await browser.capture('sessions-' + tab.toLowerCase().replaceAll(' ', '-'))
  }
  await evaluate(`document.querySelector('[role="tab"]').focus()`)
  await browser.key('ArrowRight', 39)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Tool Calls'`)
  await browser.key('End', 35)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Prompts'`)
  await evaluate(`document.querySelector('[aria-label="Deselect session"]').click()`)
  await waitFor(`document.querySelector('#session-detail-panel')?.textContent.includes('No session selected')`)

  await search('billing-api')
  assert.equal(await evaluate(`document.querySelector('#session-detail-panel').textContent.includes('No session selected')`), true)
  await clickSession('SES-1083')
  await select('Filter by agent', 'Codex')
  await waitFor(`Array.from(document.querySelectorAll('tbody tr')).every(row => row.textContent.includes('Codex'))`)
  await select('Filter by status', 'Completed')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('tbody tr')).every(row => row.textContent.includes('Completed'))`), true)
  await navigate()
  await select('Filter by status', 'Failed')
  await waitFor(`!!document.querySelector('tbody tr') && document.querySelector('tbody tr').textContent.includes('Failed')`)
  await evaluate(`document.querySelector('tbody button').click()`)
  await waitFor(`document.querySelector('#session-detail-panel')?.textContent.includes('Session Failed')`)
  assert.equal(await evaluate(`document.querySelector('#session-detail-panel').textContent.includes('Update failed')`), true)
  await browser.capture('sessions-failed')

  await navigate()
  await evaluate(`document.querySelector('[aria-controls="more-session-filters"]').click()`)
  await waitFor(`!!document.querySelector('#more-session-filters')`)
  assert.equal(await evaluate(`document.activeElement.closest('label').textContent.startsWith('Employee')`), true)
  await evaluate(`(() => { const form = document.querySelector('#more-session-filters'); const controls = form.querySelectorAll('select'); const values = ['maya', 'billing-api', 'DEV-001', '600']; controls.forEach((control, index) => { control.value = values[index]; control.dispatchEvent(new Event('change', { bubbles: true })); }); })()`)
  await evaluate(`document.querySelector('#more-session-filters').requestSubmit()`)
  await waitFor(`!document.querySelector('#more-session-filters') && location.search.includes('employee=maya')`)
  await waitFor(`document.querySelectorAll('tbody tr').length > 0 && Array.from(document.querySelectorAll('tbody tr')).every(row => row.textContent.includes('Maya Haddad'))`)
  await evaluate(`document.querySelector('[aria-controls="more-session-filters"]').click()`)
  await waitFor(`!!document.querySelector('#more-session-filters')`)
  await browser.key('Escape', 27)
  await waitFor(`!document.querySelector('#more-session-filters')`)
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-controls')`), 'more-session-filters')

  await navigate()
  await select('Sessions reporting period', '7')
  await ready()
  await select('Sessions reporting period', '90')
  await ready()
  assert.equal(await evaluate(`document.querySelector('main h2').textContent`), 'Sessions (2,544)')
  await navigate()
  await evaluate(`document.querySelector('[aria-label="Next page"]').click()`)
  await waitFor(`document.querySelector('[aria-label="Page 2"]')?.getAttribute('aria-current') === 'page'`)
  await evaluate(`document.querySelector('[aria-label="Page 129"]').click()`)
  await waitFor(`document.querySelectorAll('tbody tr').length === 4`)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Next page"]').disabled`), true)

  for (const id of ['SES-1082', entitySessions.find(session => session.id.startsWith('EA-ADAM')).id, entitySessions.find(session => session.startedAt < '2026-10-14').id]) {
    await browser.navigate('/sessions/' + encodeURIComponent(id), 'Sessions')
    await waitFor(`document.querySelector('#session-detail-panel h2')?.textContent === ${JSON.stringify(id)}`)
    assert.equal(await evaluate(`document.querySelector('tbody [aria-pressed="true"]')?.getAttribute('data-session-id')`), id)
  }
  assert.equal(await evaluate(`document.querySelector('[aria-label="Sessions reporting period"]').value`), '90')
  await evaluate(`document.querySelector('[aria-label="Deselect session"]').click()`)
  await waitFor(`document.querySelector('#session-detail-panel').textContent.includes('No session selected')`)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Sessions reporting period"]').value`), '90')
  await navigate('?session=missing-id')
  await waitFor(`document.querySelector('#session-detail-panel').textContent.includes('Session not found')`)
  await navigate('?session=SES-1082&employee=maya')
  await waitFor(`document.querySelector('#session-detail-panel').textContent.includes('outside current filters')`)
  await evaluate(`Array.from(document.querySelectorAll('#session-detail-panel button')).find(button => button.textContent === 'Clear filters').click()`)
  await waitFor(`document.querySelector('#session-detail-panel h2')?.textContent === 'SES-1082'`)

  for (const [state, text] of [['loading', 'Loading sessions'], ['empty', 'No sessions found'], ['error', 'Unable to load sessions']]) {
    await navigate('?state=' + state)
    await waitFor(`document.querySelector('main')?.textContent.includes(${JSON.stringify(text)})`)
    await browser.capture('sessions-state-' + state)
    if (state !== 'loading') {
      await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => /Try again|Reset filters/.test(button.textContent)).click()`)
      await waitFor(`document.querySelectorAll('tbody tr').length === 10`)
    }
  }

  for (const [route, title, id, period] of [['/company-overview?period=7', 'Company Overview', 'SES-1084', '7'], ['/entity-analytics?period=90', 'Entity Analytics', 'SES-1080', '90']]) {
    await browser.navigate(route, title)
    await evaluate(`document.querySelector('[aria-label=${JSON.stringify('View session ' + id)}]').click()`)
    await waitFor(`!!document.querySelector('dialog[open]')`)
    await evaluate(`document.querySelector('dialog[open] a').click()`)
    await waitFor(`document.querySelector('h1')?.textContent === 'Sessions' && document.querySelector('#session-detail-panel h2')?.textContent === ${JSON.stringify(id)}`)
    assert.equal(await evaluate(`document.querySelector('[aria-label="Sessions reporting period"]').value`), period)
  }

  await browser.viewport(390, 844)
  await navigate()
  await ready()
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Sessions must not overflow on mobile')
  await browser.capture('sessions-mobile')
  await browser.viewport(1588, 991)
  for (const [route, title, before, after] of [
    ['/company-overview', 'Company Overview', 'company-before-sessions.png', 'company-after-sessions'],
    ['/entity-analytics', 'Entity Analytics', 'entity-before-sessions.png', 'entity-after-sessions'],
    ['/departments', 'Departments', 'departments-before-sessions.png', 'departments-after-sessions'],
  ]) {
    await browser.navigate(route, title)
    await waitFor(`!!document.querySelector('tbody')`)
    await browser.capture(after)
    assert.equal((await readFile('.browser-qa/' + before)).equals(await readFile('.browser-qa/' + after + '.png')), true, title + ' appearance must remain byte-identical')
  }
  assert.deepEqual(browser.errors, [], 'No browser runtime or resource errors')
  console.log('Sessions browser checks passed: filters, advanced filters, date ranges, statuses, row/keyboard selection, tabs, pagination, deep links, earlier-page links, states and mobile layout. All three earlier page screenshots are byte-identical.')
} catch (error) {
  console.error(await evaluate(`JSON.stringify({ url: location.href, title: document.querySelector('h1')?.textContent })`))
  console.error(browser.errors)
  await browser.capture('sessions-check-failure')
  throw error
} finally { await browser.close() }
