import { Button } from './Button'
import { EmptyState } from './EmptyState'

export function ErrorState({ title = 'Something went wrong', description = 'Please try again.', onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return <div role="alert"><EmptyState icon="alert" title={title} description={description} action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>} /></div>
}
