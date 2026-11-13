import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createBrowserSession } from './browser-session.mjs'
import { publicGitHubExample } from '../src/data/traceability.ts'

const browser = await createBrowserSession()
const { evaluate, waitFor } = browser
const navigate = (query = '') => browser.navigate('/code-traceability' + query, 'Code Traceability')
const ready = () => waitFor(`document.querySelector('#trace-main-panel')?.getAttribute('aria-busy') === 'false'`)
async function mainTab(name) {
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="GitHub activity sections"] button')).find(button => button.textContent === ${JSON.stringify(name)}).click()`)
  await waitFor(`document.querySelector('[aria-label="GitHub activity sections"] [aria-selected="true"]')?.textContent === ${JSON.stringify(name)}`)
}
async function selectCommit(shortSha) {
  await evaluate(`document.querySelector('[aria-label=${JSON.stringify('Select commit ' + shortSha)}]').focus(); document.querySelector('[aria-label=${JSON.stringify('Select commit ' + shortSha)}]').click()`)
  await waitFor(`document.querySelector('#trace-detail-pane h2')?.textContent === ${JSON.stringify(shortSha)}`)
}
async function select(label, value) {
  await evaluate(`(() => { const control = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); control.value = ${JSON.stringify(value)}; control.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`)
}
async function search(value) {
  await evaluate(`(() => { const input = document.querySelector('[aria-label="Search traceability records"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await waitFor(`new URLSearchParams(location.search).get('q') === ${JSON.stringify(value)}`)
}

try {
  await browser.viewport(1588, 991)
  await navigate()
  await ready()
  assert.equal(await evaluate(`document.querySelector('main h2').textContent`), 'Commits (40)')
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 10)
  assert.equal(await evaluate(`document.querySelector('#trace-detail-pane h2').textContent`), 'a7f3d9e')
  assert.equal(await evaluate(`document.querySelector('#trace-detail-pane').textContent.includes('+142')`), true)
  assert.equal(await evaluate(`document.querySelector('#trace-detail-pane').textContent.includes('Verified')`), true)
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('main a[target="_blank"]')).every(link => link.href === ${JSON.stringify(publicGitHubExample)} && link.rel.includes('noopener'))`), true)
  await browser.capture('code-traceability-desktop')
  await evaluate(`document.querySelector('[aria-label="Select commit a7f3d9e"]').focus()`)
  await browser.key('ArrowDown', 40)
  await waitFor(`document.querySelector('#trace-detail-pane h2')?.textContent === 'b4e1c2f'`)
  assert.equal(await evaluate(`document.querySelector('#trace-detail-pane').textContent.includes('Candidate Sessions')`), true)
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="Commit details"] button')).find(button => button.textContent === 'Related Sessions').click()`)
  await waitFor(`document.querySelector('#commit-detail-content')?.textContent.includes('Temporal candidate')`)
  await browser.capture('trace-unverified-evidence')
  await selectCommit('a7f3d9e')
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="Commit details"] button')).find(button => button.textContent === 'Related Sessions').click()`)
  await waitFor(`document.querySelector('#commit-detail-content')?.textContent.includes('Demo collector commit reference')`)
  await evaluate(`document.querySelector('[aria-label="Open linked session SES-1084"]').click()`)
  await waitFor(`document.querySelector('h1')?.textContent === 'Sessions' && document.querySelector('#session-detail-panel h2')?.textContent === 'SES-1084'`)
  await navigate('?row=c9d8e7a')
  assert.equal(await evaluate(`document.querySelector('#trace-detail-pane').textContent.includes('Unlinked')`), true)
  assert.equal(await evaluate(`document.querySelectorAll('#trace-detail-pane a[aria-label^="Open linked session"]').length`), 0)
  await evaluate(`document.querySelector('[aria-label="Close traceability details"]').click()`)
  await waitFor(`document.querySelector('#trace-detail-pane').textContent.includes('No record selected')`)

  for (const query of ['a7f3d9e', 'authentication', 'web-platform', 'Maya Haddad']) {
    await navigate()
    await search(query)
    await waitFor(`!!document.querySelector('[aria-label="Select commit a7f3d9e"]')`)
  }
  await navigate()
  await select('Filter by repository', 'billing-api')
  await waitFor(`document.querySelectorAll('tbody tr').length > 0 && Array.from(document.querySelectorAll('tbody tr')).every(row => row.textContent.includes('billing-api'))`)
  await select('Traceability reporting period', '7')
  await ready()
  await select('Traceability reporting period', '90')
  await ready()
  await navigate('?period=90')
  assert.equal(await evaluate(`document.querySelector('main h2').textContent`), 'Commits (60)')
  await evaluate(`document.querySelector('[aria-label="Next trace page"]').click()`)
  await waitFor(`document.querySelector('[aria-label="Trace page 2"]')?.getAttribute('aria-current') === 'page'`)
  await evaluate(`document.querySelector('[aria-label="Trace page 6"]').click()`)
  await waitFor(`document.querySelector('[aria-label="Next trace page"]')?.disabled`)
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 10)

  await navigate()
  await evaluate(`document.querySelector('[aria-controls="trace-more-filters"]').click()`)
  await waitFor(`!!document.querySelector('#trace-more-filters')`)
  assert.equal(await evaluate(`document.querySelector('#trace-more-filters').contains(document.activeElement)`), true)
  await evaluate(`(() => { const controls = document.querySelectorAll('#trace-more-filters select'); const values = ['maya', 'feature/auth-booking', 'Verified', 'Merged']; controls.forEach((control, index) => { control.value = values[index]; control.dispatchEvent(new Event('change', { bubbles: true })); }); })()`)
  await evaluate(`document.querySelector('#trace-more-filters').requestSubmit()`)
  await waitFor(`document.querySelectorAll('tbody tr').length === 1 && location.search.includes('linkStatus=Verified')`)
  await evaluate(`document.querySelector('[aria-controls="trace-more-filters"]').click()`)
  await waitFor(`!!document.querySelector('#trace-more-filters')`)
  await browser.key('Escape', 27)
  await waitFor(`!document.querySelector('#trace-more-filters')`)
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-controls')`), 'trace-more-filters')

  await navigate()
  await evaluate(`document.querySelector('[aria-label="View merge evidence in demo PR 101"]').click()`)
  await waitFor(`document.querySelector('#trace-detail-pane h2')?.textContent === 'PR #101'`)
  assert.equal(await evaluate(`document.querySelector('#trace-detail-pane').textContent.includes('Merged at (UTC)')`), true)
  await evaluate(`Array.from(document.querySelectorAll('#trace-detail-pane button')).find(button => button.textContent.startsWith('a7f3d9e')).click()`)
  await waitFor(`document.querySelector('#trace-detail-pane h2')?.textContent === 'a7f3d9e'`)
  for (const [tab, heading] of [['Pull Requests', 'Pull Requests (10)'], ['Reviews', 'Reviews (10)'], ['Repositories', 'Repositories (4)']]) {
    await mainTab(tab)
    await waitFor(`document.querySelector('main h2')?.textContent === ${JSON.stringify(heading)}`)
    await evaluate(`document.querySelector('tbody button').click()`)
    await waitFor(`!document.querySelector('#trace-detail-pane').textContent.includes('No record selected')`)
    await browser.capture('trace-' + tab.toLowerCase().replaceAll(' ', '-'))
  }
  await evaluate(`document.querySelector('[aria-label="GitHub activity sections"] button').focus()`)
  await browser.key('ArrowRight', 39)
  await waitFor(`document.querySelector('[aria-label="GitHub activity sections"] [aria-selected="true"]')?.textContent === 'Pull Requests'`)
  await browser.key('End', 35)
  await waitFor(`document.querySelector('[aria-label="GitHub activity sections"] [aria-selected="true"]')?.textContent === 'Repositories'`)

  for (const [state, text] of [['loading', 'Loading demo GitHub activity'], ['empty', 'No commits found'], ['error', 'Unable to load traceability records']]) {
    await navigate('?state=' + state)
    await waitFor(`document.querySelector('main')?.textContent.includes(${JSON.stringify(text)})`)
    await browser.capture('trace-state-' + state)
    if (state !== 'loading') {
      await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => /Try again|Reset filters/.test(button.textContent)).click()`)
      await waitFor(`document.querySelectorAll('tbody tr').length === 10`)
    }
  }
  await browser.viewport(390, 844)
  await navigate()
  await ready()
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Traceability must not overflow on mobile')
  await browser.capture('code-traceability-mobile')
  await browser.viewport(1588, 991)
  for (const [route, title, before, after] of [
    ['/company-overview', 'Company Overview', 'company-before-trace.png', 'company-after-trace'],
    ['/entity-analytics', 'Entity Analytics', 'entity-before-trace.png', 'entity-after-trace'],
    ['/departments', 'Departments', 'departments-before-trace.png', 'departments-after-trace'],
    ['/sessions', 'Sessions', 'sessions-before-trace.png', 'sessions-after-trace'],
  ]) {
    await browser.navigate(route, title)
    await waitFor(`!!document.querySelector('tbody')`)
    await browser.capture(after)
    assert.equal((await readFile('.browser-qa/' + before)).equals(await readFile('.browser-qa/' + after + '.png')), true, title + ' must remain visually byte-identical')
  }
  assert.deepEqual(browser.errors, [], 'No browser runtime or resource errors')
  console.log('Traceability browser checks passed: all filters, date ranges, pagination, main/detail tabs, evidence, PR merge support, linked Sessions navigation, states and mobile layout. All four approved page screenshots are byte-identical.')
} catch (error) {
  console.error(await evaluate(`JSON.stringify({ url: location.href, title: document.querySelector('h1')?.textContent })`))
  console.error(browser.errors)
  await browser.capture('trace-check-failure')
  throw error
} finally { await browser.close() }
