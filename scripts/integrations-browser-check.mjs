import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createBrowserSession } from './browser-session.mjs'
const browser = await createBrowserSession()
const { evaluate, waitFor } = browser
async function navigatePage(route,title) {
  await browser.send('Page.navigate',{ url: 'http://localhost:5173' + route })
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await evaluate(`document.querySelector('h1')?.textContent === ${JSON.stringify(title)}`)) break
    await new Promise(resolve => setTimeout(resolve,100))
  }
  await waitFor(`document.querySelector('h1')?.textContent === ${JSON.stringify(title)}`)
  await evaluate(`document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))`)
}
const previous = [['/company-overview','Company Overview','company'],['/entity-analytics','Entity Analytics','entity'],['/departments','Departments','departments'],['/sessions','Sessions','sessions'],['/code-traceability','Code Traceability','trace'],['/usage-cost','Usage & Cost','usage'],['/security-findings','Security Findings','security'],['/coverage-health','Coverage & Health','coverage'],['/users-departments','Users & Departments','users']]
try {
  await browser.viewport(1588,991)
  if (process.argv.includes('--baseline')) {
    for (const [route,title,name] of previous.filter(([, , name]) => name !== 'coverage')) { await navigatePage(route,title); await waitFor(name === 'security' ? `document.querySelectorAll('[data-finding-id]').length === 5` : name === 'coverage' ? `document.querySelectorAll('[data-source-id]').length === 3` : `!!document.querySelector('tbody')`); await browser.capture(name + '-before-integrations') }
    console.log('Captured nine prior-page baselines.')
  } else {
    await navigatePage('/integrations','Integrations')
    await waitFor(`document.querySelectorAll('[data-integration-id]').length === 3`)
    await browser.capture('integrations-desktop')
    assert.equal(await evaluate(`document.querySelector('#integration-details h2').textContent`),'GitHub App')
    const navigate = (query = '') => navigatePage('/integrations' + query,'Integrations')
    const click = label => evaluate(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`)
    const button = text => evaluate(`Array.from(document.querySelectorAll('main button')).find(button => button.textContent.trim() === ${JSON.stringify(text)}).click()`)
    async function menu(text) { await click('Integration actions'); await button(text) }
    const open = () => waitFor(`!!document.querySelector('dialog[aria-labelledby="integration-dialog-title"][open]')`)
    const closed = () => waitFor(`!document.querySelector('dialog[aria-labelledby="integration-dialog-title"][open]')`)
    async function select(label,value) { await evaluate(`(() => { const el = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{ bubbles: true })); })()`); await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`) }
    async function tab(index) { await evaluate(`document.getElementById('integration-tab-${index}').click()`); await waitFor(`document.getElementById('integration-tab-${index}').getAttribute('aria-selected') === 'true'`) }
    await evaluate(`document.querySelector('[aria-label="Integration status filters"] button').click()`)
    await waitFor(`document.querySelectorAll('[data-integration-id]').length === 3`)
    await waitFor(`Array.from(document.querySelectorAll('main button')).some(button => button.textContent.trim() === 'Clear filter')`)
    await button('Clear filter')
    await waitFor(`document.querySelectorAll('[data-integration-id]').length === 3`)
    await evaluate(`document.querySelectorAll('[aria-label="Integration status filters"] button')[1].click()`)
    await waitFor(`document.querySelectorAll('[data-integration-id]').length === 0`)
    await button('Clear filter')
    await waitFor(`document.querySelectorAll('[data-integration-id]').length === 3`)
    await evaluate(`document.getElementById('integration-tab-0').focus()`)
    await browser.key('ArrowRight',39)
    await waitFor(`document.getElementById('integration-tab-1').getAttribute('aria-selected') === 'true'`)
    await tab(1)
    assert.equal(await evaluate(`document.querySelectorAll('#integration-tab-content a').length`),4)
    const repoHref = await evaluate(`document.querySelector('#integration-tab-content a').getAttribute('href')`)
    await navigatePage(repoHref,'Code Traceability')
    await navigate()
    await tab(2)
    assert.equal(await evaluate(`document.querySelector('#integration-tab-content').textContent.includes('No simulated configuration changes')`),true)
    await tab(0)
    await menu('Test demo connection')
    await waitFor(`document.querySelector('#integration-details').textContent.includes('Checking demo')`)
    await waitFor(`document.querySelector('main').textContent.includes('Demo success')`)
    assert.equal(await evaluate(`document.querySelector('#integration-details').textContent.includes('Connected (demo)')`),true)
    await menu('Disconnect demo')
    await open()
    await button('Cancel')
    await closed()
    assert.equal(await evaluate(`document.querySelector('#integration-details').textContent.includes('Connected (demo)')`),true)
    await menu('Disconnect demo')
    await open()
    await button('Confirm disconnect')
    await closed()
    await waitFor(`document.querySelector('#integration-details').textContent.includes('Disconnected (demo)')`)
    assert.equal(await evaluate(`document.querySelector('#integration-details').textContent.includes('Disconnected (demo)')`),true)
    await menu('Connect demo')
    await open()
    assert.equal(await evaluate(`document.querySelectorAll('dialog[open] input:not([type=checkbox])').length`),0,'Setup must have no credential/text inputs')
    await button('Apply demo setup')
    await waitFor(`document.querySelector('dialog[open]').textContent.includes('Choose the predefined')`)
    await select('Demo workspace','prototype-workspace')
    await evaluate(`document.querySelectorAll('dialog[open] input[type=checkbox]').forEach(el => { if (el.checked) el.click() })`)
    await button('Apply demo setup')
    await waitFor(`document.querySelector('dialog[open]').textContent.includes('at least one demo repository')`)
    await click('Include web-platform')
    await select('Simulated setup result','error')
    await button('Apply demo setup')
    await closed()
    await waitFor(`document.querySelector('#integration-details').textContent.includes('Error (demo)')`)
    await menu('Retry demo check')
    await waitFor(`document.querySelector('#integration-details').textContent.includes('Checking demo')`)
    await waitFor(`document.querySelector('#integration-details').textContent.includes('Connected (demo)')`)
    await click('Inspect LiteLLM Gateway')
    await waitFor(`document.querySelector('#integration-details h2').textContent === 'LiteLLM Gateway'`)
    assert.equal(await evaluate(`document.querySelector('#integration-details').textContent.includes('Connected (demo)')`),true)
    await tab(1)
    await waitFor(`document.querySelector('#integration-tab-content').textContent.includes('Repository scope Not Available')`)
    await click('Inspect Local Collector')
    await waitFor(`document.querySelector('#integration-details h2').textContent === 'Local Collector'`)
    await evaluate(`document.getElementById('integration-collectors').focus()`)
    await browser.key('End',35)
    await waitFor(`document.getElementById('integration-github').getAttribute('aria-pressed') === 'true'`)
    await click('Deselect integration')
    await waitFor(`document.querySelector('#integration-details').textContent.includes('No integration selected')`)
    await button('↗ Documentation')
    await open()
    assert.equal(await evaluate(`document.querySelector('dialog[open]').textContent.includes('never enter real tokens')`),true)
    await browser.key('Escape',27)
    await closed()
    for (const [query,text] of [['?state=loading','Loading integrations'],['?state=empty','No integrations found'],['?state=error','Unable to load integrations'],['?source=missing','Integration not found'],['?state=not-configured','Not Configured (demo)'],['?state=disconnected','Disconnected (demo)'],['?state=connection-error','Error (demo)'],['?role=viewer','Viewer demo'],['?role=manager','Department Manager demo']]) {
      await navigate(query)
      await waitFor(`document.querySelector('main').textContent.includes(${JSON.stringify(text)})`)
      if (query.includes('state=error')) { await button('Try again'); await waitFor(`document.querySelectorAll('[data-integration-id]').length === 3`) }
      if (query.includes('role=')) { await click('Integration actions'); assert.equal(await evaluate(`Array.from(document.querySelectorAll('#integration-details details button')).every(button => button.disabled)`),true) }
    }
    await navigate('?check=error')
    await menu('Test demo connection')
    await waitFor(`document.querySelector('#integration-details').textContent.includes('Error (demo)')`)
    await browser.viewport(390,844)
    await navigate()
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`),true)
    await browser.capture('integrations-mobile')
    await menu('Configure demo')
    await open()
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`),true)
    await browser.key('Escape',27)
    await closed()
    await browser.viewport(1588,991)
    for (const [route,title,name] of previous.filter(([, , name]) => name !== 'coverage')) { await navigatePage(route,title); await waitFor(name === 'security' ? `document.querySelectorAll('[data-finding-id]').length === 5` : name === 'coverage' ? `document.querySelectorAll('[data-source-id]').length === 3` : `!!document.querySelector('tbody')`); await browser.capture(name + '-after-integrations'); assert.equal((await readFile('.browser-qa/' + name + '-before-integrations.png')).equals(await readFile('.browser-qa/' + name + '-after-integrations.png')),true,title + ' must remain byte-identical') }
    assert.deepEqual(browser.errors,[])
    console.log('Integrations browser checks passed. All eight unrelated page screenshots are byte-identical.')
  }
} catch (error) {
  console.error(await evaluate(`JSON.stringify({ url: location.href, text: document.querySelector('main')?.textContent })`))
  console.error(browser.errors)
  await browser.capture('integrations-check-failure')
  throw error
} finally { await browser.close() }
