import type { IconName } from '../components/ui/Icon'

type NavigationItem = { title: string; path: string; description: string; icon: IconName; group: 'workspace' | 'administration' }

export const navigation = [
  {
    "title": "Company Overview",
    "path": "/company-overview",
    "description": "A company-wide view of AI-assisted development and adoption.",
    "icon": "overview",
    "group": "workspace"
  },
  {
    "title": "Entity Analytics",
    "path": "/entity-analytics",
    "description": "Explore AI coding activity across your organizational entities.",
    "icon": "analytics",
    "group": "workspace"
  },
  {
    "title": "Departments",
    "path": "/departments",
    "description": "Explore departments and their AI-assisted development activity.",
    "icon": "departments",
    "group": "workspace"
  },
  {
    "title": "Sessions",
    "path": "/sessions",
    "description": "Review AI coding sessions across your organization.",
    "icon": "sessions",
    "group": "workspace"
  },
  {
    "title": "Code Traceability",
    "path": "/code-traceability",
    "description": "Follow the relationship between AI coding activity and code changes.",
    "icon": "code",
    "group": "workspace"
  },
  {
    "title": "Usage & Cost",
    "path": "/usage-cost",
    "description": "Understand AI tool usage and associated costs.",
    "icon": "cost",
    "group": "workspace"
  },
  {
    "title": "Security Findings",
    "path": "/security-findings",
    "description": "Review security findings associated with AI-assisted development.",
    "icon": "security",
    "group": "workspace"
  },
  {
    "title": "Coverage & Health",
    "path": "/coverage-health",
    "description": "Review monitoring coverage and integration health.",
    "icon": "health",
    "group": "workspace"
  },
  {
    "title": "Users & Departments",
    "path": "/users-departments",
    "description": "Manage organization members and department assignments.",
    "icon": "users",
    "group": "administration"
  },
  {
    "title": "Integrations",
    "path": "/integrations",
    "description": "Manage connections to your development tools and AI providers.",
    "icon": "integrations",
    "group": "administration"
  },
  {
    "title": "Settings",
    "path": "/settings",
    "description": "Configure your organization preferences and workspace settings.",
    "icon": "settings",
    "group": "administration"
  },
  {
    "title": "Audit Logs",
    "path": "/audit-logs",
    "description": "Review administrative events and changes across your organization.",
    "icon": "audit",
    "group": "administration"
  }
] satisfies NavigationItem[]
