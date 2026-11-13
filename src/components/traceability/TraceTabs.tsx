import type { KeyboardEvent } from 'react'

export function TraceTabs<T extends string>({ items, selected, onChange, id, label, panelId, detail = false }: { items: readonly T[]; selected: T; onChange: (value: T) => void; id: string; label: string; panelId: string; detail?: boolean }) {
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % items.length : event.key === 'ArrowLeft' ? (index + items.length - 1) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null
    if (next === null) return
    event.preventDefault()
    onChange(items[next])
    document.getElementById(`${id}-${next}`)?.focus()
  }
  return <div role="tablist" aria-label={label} className={`grid min-h-[42px] w-full rounded-xl border border-line bg-surface ${detail ? 'max-w-[284px] grid-cols-[1fr_1.55fr]' : 'max-w-[580px] grid-cols-[1fr_1.25fr_1.05fr_1.15fr]'}`}>{items.map((item, index) => <button type="button" role="tab" key={item} id={`${id}-${index}`} aria-controls={panelId} aria-selected={selected === item} tabIndex={selected === item ? 0 : -1} onClick={() => onChange(item)} onKeyDown={event => navigate(event, index)} className={`rounded-xl px-2 py-2 text-xs font-semibold sm:text-base ${selected === item ? 'bg-success-soft text-success' : 'hover:bg-canvas'}`}>{item}</button>)}</div>
}
