import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { navigation } from './data/navigation'
import { AppLayout } from './layouts/AppLayout'
import { PagePlaceholder } from './components/PagePlaceholder'
import { CompanyOverviewPage } from './pages/CompanyOverviewPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { EntityAnalyticsPage } from './pages/EntityAnalyticsPage'
import { DepartmentsPage } from './pages/DepartmentsPage'
import { SessionsPage, SessionRouteRedirect } from './pages/SessionsPage'
import { CodeTraceabilityPage } from './pages/CodeTraceabilityPage'
import { UsageCostPage } from './pages/UsageCostPage'
import { SecurityFindingsPage } from './pages/SecurityFindingsPage'
import { CoverageHealthPage } from './pages/CoverageHealthPage'
import { LoadingState } from './components/ui/LoadingState'

const UsersDepartmentsPage = lazy(() => import('./pages/UsersDepartmentsPage').then(module => ({ default: module.UsersDepartmentsPage })))
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage').then(module => ({ default: module.IntegrationsPage })))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/company-overview" replace />} />
          <Route path="/company-overview" element={<CompanyOverviewPage />} />
          <Route path="/entity-analytics" element={<EntityAnalyticsPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:sessionId" element={<SessionRouteRedirect />} />
          <Route path="/code-traceability" element={<CodeTraceabilityPage />} />
          <Route path="/usage-cost" element={<UsageCostPage />} />
          <Route path="/security-findings" element={<SecurityFindingsPage />} />
          <Route path="/coverage-health" element={<CoverageHealthPage />} />
          <Route path="/users-departments" element={<Suspense fallback={<LoadingState message="Loading directory…" />}><UsersDepartmentsPage /></Suspense>} />
          <Route path="/integrations" element={<Suspense fallback={<LoadingState message="Loading integrations…" />}><IntegrationsPage /></Suspense>} />
          {navigation.filter(page => !['/company-overview', '/entity-analytics', '/departments', '/sessions', '/code-traceability', '/usage-cost', '/security-findings', '/coverage-health', '/users-departments', '/integrations'].includes(page.path)).map(page => (
            <Route key={page.path} path={page.path} element={<PagePlaceholder title={page.title} description={page.description} />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
