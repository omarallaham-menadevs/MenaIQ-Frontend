import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Brand, Sidebar } from '../components/Sidebar'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { navigation } from '../data/navigation'
import { trapDialogFocus } from '../utils/trapDialogFocus'

export function AppLayout() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const location = useLocation()
  const title = navigation.find(page => page.path === location.pathname)?.title ?? 'Page not found'

  useEffect(() => {
    dialogRef.current?.close()
    document.title = title + ' | MenaIQ'
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [location.pathname, title])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) dialogRef.current?.close() }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <div className="min-h-svh">
      <a href="#main-content" className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white focus:translate-y-0">Skip to main content</a>
      <aside aria-label="Workspace sidebar" className="fixed inset-y-0 left-0 hidden w-[252px] border-r border-line lg:block"><Sidebar /></aside>
      <header className="flex h-18 items-center justify-between border-b border-line bg-surface px-5 lg:hidden">
        <Brand />
        <Button variant="ghost" aria-label="Open navigation" aria-haspopup="dialog" aria-controls="mobile-navigation" onClick={() => dialogRef.current?.showModal()}><Icon name="menu" /></Button>
      </header>
      <dialog ref={dialogRef} onKeyDown={trapDialogFocus} id="mobile-navigation" aria-label="Navigation menu" className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[90vw] border-0 bg-surface p-0 text-ink backdrop:bg-ink/30" onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX > rect.right || event.clientX < rect.left || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close()
      }}>
        <div className="relative h-full">
          <Button autoFocus variant="ghost" className="absolute right-2 top-2 px-2" aria-label="Close navigation" onClick={() => dialogRef.current?.close()}><Icon name="close" /></Button>
          <Sidebar onNavigate={() => dialogRef.current?.close()} />
        </div>
      </dialog>
      <div className="lg:pl-[252px]">
        <main ref={mainRef} id="main-content" tabIndex={-1} className="mx-auto max-w-[1700px] px-4 py-6 outline-none sm:px-7 lg:py-7"><Outlet /></main>
      </div>
    </div>
  )
}
