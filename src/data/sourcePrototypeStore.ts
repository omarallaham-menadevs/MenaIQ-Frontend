import { useSyncExternalStore } from 'react'
import { createSourcePrototype, restoreSourcePrototype, serializeSourcePrototype, sourceStorageKey, type SourcePrototype } from './sourcePrototype'

function read() { try { return restoreSourcePrototype(typeof window === 'undefined' ? null : window.sessionStorage.getItem(sourceStorageKey)) } catch { return createSourcePrototype() } }
let snapshot = read()
const listeners = new Set<() => void>()
export function commitSourcePrototype(next: SourcePrototype) {
  snapshot = next
  try { window.sessionStorage.setItem(sourceStorageKey,serializeSourcePrototype(next)) } catch { /* In-memory navigation remains available when browser storage is disabled. */ }
  listeners.forEach(listener => listener())
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
function getSnapshot() { return snapshot }
export function useSourcePrototype() { return useSyncExternalStore(subscribe,getSnapshot,getSnapshot) }
