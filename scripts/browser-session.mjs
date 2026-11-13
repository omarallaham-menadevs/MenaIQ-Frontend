import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Local Chrome DevTools driver: no browser packages or application dependencies.
export async function createBrowserSession() {
  const output = path.resolve('.browser-qa')
  await mkdir(output, { recursive: true })
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${path.join(output, 'entity-profile')}`,
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  let socket
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000)
      let log = ''
      browser.on('error', error => { clearTimeout(timeout); reject(error) })
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
      const message = JSON.parse(event.data)
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry)
      const handler = pending.get(message.id)
      if (handler) {
        pending.delete(message.id)
        if (message.error) handler.reject(new Error(JSON.stringify(message.error)))
        else handler.resolve(message.result)
      }
    }
    function send(method, params = {}, useSession = true) {
      return new Promise((resolve, reject) => {
        const requestId = ++id
        pending.set(requestId, { resolve, reject })
        socket.send(JSON.stringify({ id: requestId, method, params, ...(useSession && sessionId ? { sessionId } : {}) }))
      })
    }
    const target = await send('Target.createTarget', { url: 'about:blank' }, false)
    sessionId = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, false)).sessionId
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Log.enable')
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    async function waitFor(expression, timeoutMs = 20000) {
      // Cold Vite module graphs can exceed five seconds on the Windows workspace.
      // Keep failures bounded while allowing the page to finish loading before asserting.
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        if (await evaluate(expression)) return
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      throw new Error('Timed out: ' + expression)
    }
    return {
      send, evaluate, waitFor, errors,
      async viewport(width, height) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }) },
      async navigate(route, title) {
        await send('Page.navigate', { url: 'http://localhost:5173' + route })
        await waitFor(`document.querySelector('h1')?.textContent === ${JSON.stringify(title)}`)
        await evaluate('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))')
      },
      async capture(name) {
        const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
        await writeFile(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'))
      },
      async key(key, virtualCode) {
        for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: virtualCode, nativeVirtualKeyCode: virtualCode })
      },
      async close() {
        await send('Browser.close', {}, false)
        socket.close()
        browser.kill()
      },
    }
  } catch (error) {
    socket?.close()
    browser.kill()
    throw error
  }
}
