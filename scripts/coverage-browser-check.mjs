import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createBrowserSession } from './browser-session.mjs'

const browser = await createBrowserSession()
const { evaluate, waitFor } = browser
const previous = [['/company-overview','Company Overview','company'],['/entity-analytics','Entity Analytics','entity'],['/departments','Departments','departments'],['/sessions','Sessions','sessions'],['/code-traceability','Code Traceability','trace'],['/usage-cost','Usage & Cost','usage'],['/security-findings','Security Findings','security']]
try {
  await browser.viewport(1588, 991)
  if (process.argv.includes('--baseline')) {
    for (const [route,title,name] of previous) {
      await browser.navigate(route,title)
      await waitFor(name === 'security' ? `document.querySelectorAll('[data-finding-id]').length === 5` : `!!document.querySelector('tbody')`)
      await browser.capture(name + '-before-coverage')
    }
    console.log('Captured seven approved pages before Coverage & Health changes.')
  } else {
    const navigate = query => browser.navigate('/coverage-health' + (query ?? ''), 'Coverage & Health')
    const click = label => evaluate(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`)
    const button = text => evaluate(`Array.from(document.querySelectorAll('main button')).find(button => button.textContent.includes(${JSON.stringify(text)})).click()`)
    async function selectPeriod(value) {
      await evaluate(`(() => { const el = document.querySelector('[aria-label="Coverage reporting period"]'); el.value = '${value}'; el.dispatchEvent(new Event('change', { bubbles: true })); })()`)
      await waitFor(`new URLSearchParams(location.search).get('period') === '${value}' && !document.querySelector('[aria-busy="true"]')`)
    }
    await navigate()
    await waitFor(`document.querySelectorAll('[data-source-id]').length === 3`)
    assert.equal(await evaluate(`document.querySelector('#source-detail h2').textContent`), 'GitHub Integration')
    assert.equal(await evaluate(`document.querySelector('[data-source-id="github"]').getAttribute('aria-pressed')`), 'true')
    await browser.capture('coverage-health-desktop')
    await click('Inspect LiteLLM Gateway')
    await waitFor(`document.querySelector('#source-detail h2').textContent === 'LiteLLM Gateway'`)
    await waitFor(`document.querySelector('#source-detail').textContent.includes('5,382 observed demo requests')`)
    await button('Monitoring Limitations')
    await waitFor(`!!document.querySelector('#monitoring-limitations-content')`)
    assert.equal(await evaluate(`document.querySelector('#monitoring-limitations-content').textContent.includes('8,420,000')`), true)
    await selectPeriod(7)
    await waitFor(`document.querySelector('#source-detail').textContent.includes('Last 7 days')`)
    assert.equal(await evaluate(`document.querySelector('#source-detail').textContent.includes('5,382 observed demo requests')`), false)
    await selectPeriod(90)
    await waitFor(`document.querySelector('#source-detail').textContent.includes('91 events')`)
    await click('Inspect Local Collectors')
    await waitFor(`document.querySelector('#source-detail h2').textContent === 'Local Collectors'`)
    assert.equal(await evaluate(`document.querySelector('#monitoring-limitations-content').textContent.includes('4 of 5')`), true)
    assert.equal(await evaluate(`document.querySelector('#monitoring-limitations-content').textContent.includes('Not Available')`), true)
    await evaluate(`document.getElementById('source-collectors').focus()`)
    await browser.key('ArrowDown', 40)
    await waitFor(`document.getElementById('source-litellm').getAttribute('aria-pressed') === 'true'`)
    await click('Deselect reporting source')
    await waitFor(`document.querySelector('#source-detail').textContent.includes('No source selected')`)
    await navigate('?filter=issues')
    assert.equal(await evaluate(`document.querySelectorAll('[data-source-id]').length`), 3)
    await evaluate(`Array.from(document.querySelectorAll('[aria-label="Source health filters"] button')).find(button => button.textContent.includes('Delayed')).click()`)
    await waitFor(`document.querySelectorAll('[data-source-id]').length === 2`)
    await evaluate(`(() => { const el = document.querySelector('[aria-label="Search reporting sources"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'LiteLLM'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`)
    await waitFor(`document.querySelectorAll('[data-source-id]').length === 1`)
    await waitFor(`document.querySelector('#source-detail h2').textContent === 'LiteLLM Gateway'`)
    await navigate('?source=litellm')
    await waitFor(`document.querySelector('#source-detail h2').textContent === 'LiteLLM Gateway'`)
    const usageHref = await evaluate(`document.querySelector('[aria-label="View usage details"]').getAttribute('href')`)
    await browser.navigate(usageHref, 'Usage & Cost')
    await navigate('?source=collectors')
    const deviceHref = await evaluate(`document.querySelector('[aria-label="View device details"]').getAttribute('href')`)
    await browser.navigate(deviceHref, 'Entity Analytics')
    await waitFor(`document.querySelector('main').textContent.includes('ENG-LEGACY-01')`)
    await navigate('?source=github')
    const traceHref = await evaluate(`document.querySelector('[aria-label="View traceability details"]').getAttribute('href')`)
    await browser.navigate(traceHref, 'Code Traceability')
    for (const [query,text] of [['?state=loading','Loading reporting sources'],['?state=empty','No reporting sources found'],['?state=error','Unable to load reporting sources'],['?source=none','No source selected'],['?source=missing','Source not found'],['?state=unavailable&source=litellm','Not Available'],['?state=not-configured&source=github','Not Configured'],['?state=degraded&source=collectors','Degraded'],['?role=viewer','Read-only demo view']]) {
      await navigate(query)
      await waitFor(`document.querySelector('main').textContent.includes(${JSON.stringify(text)})`)
      if (query.includes('unavailable')) {
        await button('Monitoring Limitations')
        await waitFor(`document.querySelector('#monitoring-limitations-content')?.textContent.includes('Not Available')`)
        assert.equal(await evaluate(`document.querySelector('#source-detail').textContent.includes('0 observed')`), false)
      }
      if (query.includes('error')) { await button('Try again'); await waitFor(`document.querySelectorAll('[data-source-id]').length === 3`) }
      if (query.includes('empty')) { await button('Reset filters'); await waitFor(`document.querySelectorAll('[data-source-id]').length === 3`) }
      if (query.includes('viewer')) { await click('Inspect LiteLLM Gateway'); await waitFor(`document.querySelector('#source-detail h2').textContent === 'LiteLLM Gateway'`) }
    }
    await browser.viewport(390, 844)
    await navigate()
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'No mobile overflow')
    await browser.capture('coverage-health-mobile')
    await button('See Monitoring Limitations')
    await waitFor(`!!document.querySelector('#monitoring-limitations-content')`)
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'Expanded scope must fit mobile')
    await browser.viewport(1588, 991)
    for (const [route,title,name] of previous) {
      await browser.navigate(route,title)
      await waitFor(name === 'security' ? `document.querySelectorAll('[data-finding-id]').length === 5` : `!!document.querySelector('tbody')`)
      await browser.capture(name + '-after-coverage')
      assert.equal((await readFile('.browser-qa/' + name + '-before-coverage.png')).equals(await readFile('.browser-qa/' + name + '-after-coverage.png')), true, title + ' must remain visually byte-identical')
    }
    assert.deepEqual(browser.errors, [])
    console.log('Coverage browser checks passed: selection, combined filters, date scope, history, keyboard navigation, issue links, limitations, all states, read-only and mobile. All seven prior page screenshots are byte-identical.')
  }
} finally { await browser.close() }
