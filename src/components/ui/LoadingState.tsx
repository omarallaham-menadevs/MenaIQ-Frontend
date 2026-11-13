import { Icon } from './Icon'

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return <div role="status" className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-muted"><Icon name="loader" className="animate-spin text-accent" /><span>{message}</span></div>
}
