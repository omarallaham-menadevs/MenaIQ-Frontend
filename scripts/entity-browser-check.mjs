import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createBrowserSession } from './browser-session.mjs'

const browser = await createBrowserSession()
const { evaluate, waitFor } = browser
const navigate = (query = '') => browser.navigate('/entity-analytics' + query, 'Entity Analytics')
const ready = () => waitFor(`document.querySelector('[role="tabpanel"]')?.getAttribute('aria-busy') === 'false'`)
async function select(label, value) {
  await evaluate(`(() => { const control = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); control.value = ${JSON.stringify(value)}; control.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await ready()
}
async function tab(name) {
  await evaluate(`Array.from(document.querySelectorAll('[role="tab"]')).find(tab => tab.textContent === ${JSON.stringify(name)}).click()`)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === ${JSON.stringify(name)}`)
}

try {
  await browser.viewport(1588, 991)
  await navigate()
  await ready()
  await browser.capture('entity-analytics-desktop')
  assert.equal(await evaluate(`document.querySelector('aside [aria-current="page"]')?.textContent`), 'Entity Analytics')
  assert.equal(await evaluate(`document.querySelector('[aria-label="Entity summary"]').textContent.includes('186')`), true)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Entity summary"]').textContent.includes('2.41M')`), true)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Entity summary"]').textContent.includes('$92.30')`), true)
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('tbody tr th'), cell => cell.textContent)`), ['SES-1084', 'SES-1080', 'SES-1079'])

  await evaluate(`document.querySelector('[aria-label="View session SES-1080"]').focus(); document.querySelector('[aria-label="View session SES-1080"]').click()`)
  await waitFor(`document.querySelector('dialog[open]')?.textContent.includes('Maya Haddad')`)
  await browser.key('Tab', 9)
  assert.equal(await evaluate(`document.querySelector('dialog[open]').contains(document.activeElement)`), true)
  await browser.key('Escape', 27)
  await waitFor(`!document.querySelector('dialog[open]')`)
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`), 'View session SES-1080')

  await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes('View all sessions')).click()`)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Sessions'`)
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 10)
  const firstId = await evaluate(`document.querySelector('tbody th').textContent`)
  await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes('Next')).click()`)
  await waitFor(`document.querySelector('tbody th')?.textContent !== ${JSON.stringify(firstId)}`)
  assert.equal(await evaluate(`document.querySelector('[role="tabpanel"] [role="status"]').textContent`), 'Page 2 of 19')

  await tab('Usage & Cost')
  assert.equal(await evaluate(`document.querySelector('[role="tabpanel"]').textContent.includes('Usage by agent')`), true)
  await browser.capture('entity-usage')
  await tab('Security')
  assert.equal(await evaluate(`document.querySelectorAll('[role="tabpanel"] li').length`), 3)
  await browser.capture('entity-security')
  await select('Entity reporting period', '7')
  assert.equal(await evaluate(`document.querySelectorAll('[role="tabpanel"] li').length`), 2)
  await tab('Overview')
  assert.equal(await evaluate(`document.querySelector('[aria-label="Entity summary"]').textContent.includes('186')`), false)
  await select('Entity reporting period', '90')
  assert.equal(await evaluate(`location.search.includes('period=90')`), true)

  for (const [id, name, sessionId] of [['omar', 'Omar Saleh', 'SES-1083'], ['lina', 'Lina Nasser', 'SES-1082'], ['adam', 'Adam Khalil', 'EA-ADAM-20261112-32']]) {
    await select('Selected employee', id)
    assert.equal(await evaluate(`document.querySelector('main h2')?.textContent`), name)
    assert.equal(await evaluate(`document.querySelector('tbody th')?.textContent`), sessionId)
  }
  await select('Selected employee', 'noor')
  assert.equal(await evaluate(`document.querySelector('main').textContent.includes('No sessions in this period')`), true)
  await browser.capture('entity-empty-employee')

  await select('Entity type', 'device')
  assert.equal(await evaluate(`document.querySelector('main h2').textContent`), 'ENG-MAYA-01')
  await select('Selected device', 'DEV-002')
  assert.equal(await evaluate(`document.querySelector('[aria-label="Entity summary"]').textContent.includes('Not Available')`), true)
  assert.equal(await evaluate(`document.querySelector('tbody th').textContent`), 'SES-1083')
  await tab('Usage & Cost')
  assert.equal(await evaluate(`document.querySelector('[role="tabpanel"]').textContent.includes('Not Available')`), true)
  await browser.capture('entity-device-unmeasured')
  await select('Selected device', 'DEV-005')
  assert.equal(await evaluate(`document.querySelector('[role="tabpanel"]').textContent.includes('not reporting telemetry')`), true)
  await browser.capture('entity-unavailable')

  for (const [state, text] of [['loading', 'Loading analytics for'], ['empty', 'No activity in this period'], ['error', 'Unable to load entity analytics']]) {
    await navigate('?state=' + state)
    await waitFor(`document.querySelector('[role="tabpanel"]')?.textContent.includes(${JSON.stringify(text)})`)
    await browser.capture('entity-state-' + state)
    if (state !== 'loading') {
      await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => /Try again|Show sample data/.test(button.textContent)).click()`)
      await waitFor(`!!document.querySelector('tbody') && !location.search.includes('state=')`)
    }
  }

  await navigate()
  await evaluate(`document.querySelector('[role="tab"]').focus()`)
  await browser.key('ArrowRight', 39)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Sessions'`)
  await browser.key('End', 35)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Security'`)
  await browser.key('Home', 36)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Overview'`)

  await evaluate(`document.querySelector('main summary').click()`)
  await evaluate(`Array.from(document.querySelectorAll('main details button')).find(button => button.textContent === 'View entity details').click()`)
  await waitFor(`document.querySelector('dialog[open]')?.textContent.includes('maya.haddad@menaiq.com')`)
  await browser.key('Escape', 27)
  await waitFor(`!document.querySelector('dialog[open]')`)
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`), 'Entity actions')
  await evaluate(`document.querySelector('main summary').click(); Array.from(document.querySelectorAll('main details button')).find(button => button.textContent === 'View sessions').click()`)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Sessions'`)
  await evaluate(`document.querySelector('main summary').click(); Array.from(document.querySelectorAll('main details button')).find(button => button.textContent === 'View security').click()`)
  await waitFor(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Security'`)

  await browser.viewport(390, 844)
  await navigate()
  await ready()
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Mobile page must not overflow')
  await browser.capture('entity-analytics-mobile')
  await select('Entity type', 'device')
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Mobile device profile must not overflow')
  await browser.capture('entity-device-mobile')

  await browser.viewport(1588, 991)
  await browser.navigate('/company-overview', 'Company Overview')
  await waitFor(`document.querySelector('tbody tr')?.textContent.includes('SES-1084')`)
  await browser.capture('company-overview-after-entity')
  const before = await readFile('.browser-qa/company-overview-before-entity.png')
  const after = await readFile('.browser-qa/company-overview-after-entity.png')
  assert.equal(before.equals(after), true, 'Company Overview screenshot must remain byte-identical')
  assert.deepEqual(browser.errors, [], 'No browser runtime or resource errors')
  console.log('Entity browser checks passed: employee/device filters, 7/30/90-day ranges, tab content and keyboard navigation, pagination, sessions, profile actions, state recovery, Not Available values, and mobile overflow. Company Overview screenshot is byte-identical.')
} finally {
  await browser.close()
}
