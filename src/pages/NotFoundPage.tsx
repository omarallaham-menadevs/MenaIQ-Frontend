import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'

export function NotFoundPage() {
  return <div className="space-y-8"><PageHeader title="Page not found" description="The page you’re looking for doesn’t exist." /><Card><EmptyState title="404 — Not Found" description="Check the address or return to Company Overview." action={<Link className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90" to="/company-overview">Go to Company Overview</Link>} /></Card></div>
}
