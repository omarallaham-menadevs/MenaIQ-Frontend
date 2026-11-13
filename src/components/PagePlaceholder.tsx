import { PageHeader } from './ui/PageHeader'

export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <p className="mt-8 text-sm text-muted">This page will be implemented in a future iteration.</p>
    </div>
  )
}
