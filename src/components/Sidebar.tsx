import { NavLink } from 'react-router-dom'
import { navigation } from '../data/navigation'
import { cn } from '../utils/cn'
import { Icon } from './ui/Icon'

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-xl font-semibold text-white" aria-hidden="true">M</span>
      <span className="text-[21px] font-bold tracking-tight">MenaIQ</span>
    </div>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-[100px] shrink-0 items-start px-[26px] pt-7"><Brand /></div>
      <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-6">
        <ul className="space-y-1">
          {navigation.filter(item => item.group === 'workspace').map(item => (
            <NavigationLink key={item.path} item={item} onNavigate={onNavigate} />
          ))}
        </ul>
        <h2 className="mb-2 mt-10 px-3.5 text-[10px] font-bold uppercase text-ink">Administration</h2>
        <ul className="space-y-1">
          {navigation.filter(item => item.group === 'administration').map(item => (
            <NavigationLink key={item.path} item={item} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>
      <div className="mx-6 flex shrink-0 items-center gap-3 border-t border-line pb-8 pt-[18px]">
        <div aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral text-sm font-semibold">OA</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Omar Allahham</p>
          <p className="mt-0.5 text-[13px] text-muted">Administrator</p>
        </div>
      </div>
    </div>
  )
}

function NavigationLink({ item, onNavigate }: { item: typeof navigation[number]; onNavigate?: () => void }) {
  return (
    <li>
      <NavLink end to={item.path} onClick={onNavigate} className={({ isActive }) => cn(
        'relative flex min-h-[41px] items-center gap-[18px] rounded-r-lg py-2.5 pl-3.5 pr-2 text-sm font-medium transition-colors',
        isActive ? 'bg-selected text-accent before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent' : 'text-ink hover:bg-canvas',
      )}>
        {({ isActive }) => <><Icon name={item.icon} className={cn('size-4 shrink-0', isActive || item.icon === 'health' ? 'text-accent' : 'text-muted')} /><span>{item.title}</span></>}
      </NavLink>
    </li>
  )
}
