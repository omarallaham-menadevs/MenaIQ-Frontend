import type { KeyboardEvent } from 'react'
import { entityTabs, type EntityTab } from '../../data/entityAnalytics'
import { cn } from '../../utils/cn'

export function EntityTabs({ selected, onChange }: { selected: EntityTab; onChange: (tab: EntityTab) => void }) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % entityTabs.length
    else if (event.key === 'ArrowLeft') next = (index + entityTabs.length - 1) % entityTabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = entityTabs.length - 1
    else return
    event.preventDefault()
    onChange(entityTabs[next])
    document.getElementById(`entity-tab-${next}`)?.focus()
  }

  return (
    <div role="tablist" aria-label="Entity analytics sections" className="grid min-h-[42px] w-full max-w-[548px] grid-cols-[1fr_1fr_1.2fr_1fr] rounded-[14px] border border-line bg-surface">
      {entityTabs.map((tab, index) => (
        <button type="button" role="tab" key={tab} id={`entity-tab-${index}`} aria-selected={selected === tab} aria-controls="entity-tab-panel" tabIndex={selected === tab ? 0 : -1} onClick={() => onChange(tab)} onKeyDown={event => onKeyDown(event, index)} className={cn('rounded-[14px] px-2 py-2 text-xs font-semibold sm:text-base', selected === tab ? 'bg-success-soft text-success' : 'hover:bg-canvas')}>{tab}</button>
      ))}
    </div>
  )
}
