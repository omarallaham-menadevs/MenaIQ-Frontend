import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

// Uses the installed Chrome and its native DevTools protocol; no test dependency.
const output = path.resolve('.browser-qa')
await mkdir(output, { recursive: true })
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${path.join(output, 'profile')}`,
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })

let socket
try {
  const endpoint = await new Promise((resolve, reject) => {
    let log = ''
    const timeout = setTimeout(() => reject(new Error('Chrome did not start within 15 seconds')), 15000)
    browser.on('error', reject)
    browser.stderr.on('data', data => {
      log += data
      const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) { clearTimeout(timeout); resolve(match[1]) }
    })
  })
  socket = new WebSocket(endpoint)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let id = 0
  let sessionId
  const pending = new Map()
  const errors = []
  socket.onmessage = event => {
    const response = JSON.parse(event.data)
    if (response.method === 'Runtime.exceptionThrown') errors.push(response.params.exceptionDetails.text)
    if (response.method === 'Log.entryAdded' && response.params.entry.level === 'error') errors.push(response.params.entry.text)
    if (response.id) {
      const handler = pending.get(response.id)
      pending.delete(response.id)
      if (response.error) handler?.reject(new Error(JSON.stringify(response.error)))
      else handler?.resolve(response.result)
    }
  }
  function send(method, params = {}, useSession = true) {
    return new Promise((resolve, reject) => {
      const requestId = ++id
      pending.set(requestId, { resolve, reject })
      socket.send(JSON.stringify({ id: requestId, method, params, ...(useSession && sessionId ? { sessionId } : {}) }))
    })
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, false)
  const attached = await send('Target.attachToTarget', { targetId, flatten: true }, false)
  sessionId = attached.sessionId
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails))
    return response.result.value
  }
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error('Timed out: ' + expression)
  }
  async function navigate(suffix = '') {
    await send('Page.navigate', { url: 'http://localhost:5173/company-overview' + suffix })
    await waitFor(`document.querySelector('h1')?.textContent === 'Company Overview'`)
    await evaluate('document.fonts.ready.then(() => true)')
  }
  async function capture(name) {
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    await writeFile(path.join(output, name + '.png'), Buffer.from(image.data, 'base64'))
  }
  async function escape() {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1588, height: 991, deviceScaleFactor: 1, mobile: false })
  await navigate()
  await waitFor(`document.querySelector('tbody tr')?.textContent.includes('SES-1084')`)
  await capture('company-overview-desktop')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Desktop must not overflow')
  assert.equal(await evaluate(`document.querySelector('aside nav [aria-current="page"]')?.textContent`), 'Company Overview')
  assert.equal(await evaluate(`document.querySelector('[aria-label="Summary"]')?.textContent.includes('1,284')`), true)

  await evaluate(`document.querySelector('[aria-label="Reporting period"]').value = '7'; document.querySelector('[aria-label="Reporting period"]').dispatchEvent(new Event('change', { bubbles: true }))`)
  await waitFor(`document.querySelector('[aria-busy]')?.getAttribute('aria-busy') === 'false' && location.search.includes('period=7')`)
  assert.equal(await evaluate(`document.querySelector('svg[role="img"] title')?.textContent`), 'Daily sessions over the last 7 days')
  assert.equal(await evaluate(`document.querySelector('svg[role="img"]').querySelectorAll('circle').length`), 7)
  await evaluate(`document.querySelector('[aria-label="Reporting period"]').value = '90'; document.querySelector('[aria-label="Reporting period"]').dispatchEvent(new Event('change', { bubbles: true }))`)
  await waitFor(`document.querySelector('svg[role="img"]')?.querySelectorAll('circle').length === 90`)

  await evaluate(`document.querySelector('[aria-label="View session SES-1084"]').focus(); document.querySelector('[aria-label="View session SES-1084"]').click()`)
  await waitFor(`document.querySelector('dialog[aria-labelledby="session-detail-title"]')?.open`)
  assert.equal(await evaluate(`document.querySelector('dialog[open]').textContent.includes('Maya Haddad')`), true)
  await capture('session-details')
  await escape()
  await waitFor(`!document.querySelector('dialog[open]')`)
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`), 'View session SES-1084')

  const navigation = await evaluate(`Array.from(document.querySelectorAll('aside nav a'), a => ({ path: a.getAttribute('href'), title: a.textContent }))`)
  assert.equal(navigation.length, 12)
  for (const entry of navigation) {
    await evaluate(`Array.from(document.querySelectorAll('aside nav a')).find(a => a.getAttribute('href') === ${JSON.stringify(entry.path)}).click()`)
    await waitFor(`document.querySelector('h1')?.textContent === ${JSON.stringify(entry.title)}`)
    assert.equal(await evaluate(`document.querySelector('aside nav [aria-current="page"]')?.textContent`), entry.title)
  }

  await navigate()
  for (const [label, pathName] of [['View all sessions', '/sessions'], ['3 Critical findings', '/security-findings'], ['LiteLLM delayed', '/coverage-health'], ['3 collection issues', '/coverage-health']]) {
    await evaluate(`Array.from(document.querySelectorAll('main a')).find(a => a.textContent.includes(${JSON.stringify(label)})).click()`)
    await waitFor(`location.pathname === ${JSON.stringify(pathName)} && !!document.querySelector('h1')`)
    await navigate()
  }

  for (const state of ['loading', 'empty', 'error']) {
    await navigate('?state=' + state)
    await waitFor(`document.querySelector('main')?.textContent.includes(${JSON.stringify(state === 'loading' ? 'Loading the last' : state === 'empty' ? 'No activity in this period' : 'Unable to load Company Overview')})`)
    await capture('state-' + state)
    if (state !== 'loading') {
      await evaluate(`Array.from(document.querySelectorAll('main button')).find(button => /Try again|Show sample data/.test(button.textContent)).click()`)
      await waitFor(`!!document.querySelector('tbody') && !location.search.includes('state=')`)
    }
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
  await navigate()
  await waitFor(`!!document.querySelector('tbody')`)
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Mobile must not overflow')
  await capture('company-overview-mobile')
  await evaluate(`document.querySelector('[aria-label="Open navigation"]').focus(); document.querySelector('[aria-label="Open navigation"]').click()`)
  await waitFor(`document.querySelector('#mobile-navigation').open`)
  for (let i = 0; i < 15; i++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    assert.equal(await evaluate(`document.querySelector('#mobile-navigation').contains(document.activeElement)`), true, 'Focus must remain in mobile dialog')
  }
  await capture('mobile-navigation')
  await escape()
  await waitFor(`!document.querySelector('#mobile-navigation').open`)
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`), 'Open navigation')
  assert.deepEqual(errors, [], 'Browser must have no runtime errors')
  console.log('Browser checks passed: 12 routes, active states, date periods, session details, attention links, loading/empty/error recovery, desktop/mobile overflow, dialog focus and Escape. Screenshots: .browser-qa/')
  await send('Browser.close', {}, false)
} finally {
  socket?.close()
  browser.kill()
}
