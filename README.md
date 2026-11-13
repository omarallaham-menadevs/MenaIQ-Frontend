# MenaIQ Frontend

React + TypeScript + Vite with Tailwind CSS, React Router, self-hosted Inter, and Lucide icons.

Company Overview, Entity Analytics, Departments, Sessions, Code Traceability, and Usage & Cost are implemented from their approved images in `design-references/`. The original references are preserved. Other sidebar destinations remain simple temporary placeholders.

## Development

- `npm.cmd install` — install dependencies.
- `npm.cmd run dev` — start Vite; open the printed local URL, normally http://localhost:5173/company-overview.
- `npm.cmd run build` — type-check and build production assets into `dist/`.
- `npm.cmd run lint` — run Oxlint.
- `npm.cmd run preview` — preview the production build.
- `node --test scripts/company-overview.test.mjs` — check deterministic data and date ranges (Node 22.18+).
- `node scripts/browser-check.mjs` — run desktop/mobile browser verification using installed Chrome on Windows and a running Vite server. Saves ignored screenshots in `.browser-qa/` and closes its own headless browser.

## Company Overview

The 7-, 30-, and 90-day selector updates the summary and daily session trend. Its URL parameter is shareable, for example `/company-overview?period=7`. All fixtures end on 12 November 2026, regardless of the machine date. Daily session, token, and cost values aggregate to the displayed totals; findings and collection health are current snapshots.

The 30-day summary retains the reference's 1,284 sessions, 8.42M tokens, $318.40 estimated cost, and 12 open findings. The chart keeps the reference's trend shape but rescales the daily counts and axis to reconcile with 1,284 total sessions. Recent activity times are shown in UTC.

Select a session ID to open its details. View all sessions opens the Sessions placeholder; attention items and the collection-issues indicator link to the relevant placeholders. No real API, authentication, or database is used.

Reviewable state URLs:

- `/company-overview?state=loading`
- `/company-overview?state=empty` — Show sample data restores normal content.
- `/company-overview?state=error` — Try again restores normal content.

A brief local loading state also appears when changing the period.

## Structure

- `src/pages/CompanyOverviewPage.tsx` — overview composition, reporting-period selection, and preview states.
- `src/components/overview/` — summary cards, SVG trend chart, attention panel, sessions table, statuses, and session detail dialog.
- `src/data/companyOverview.ts` — deterministic fixtures, aggregations, formatting, and parameter validation.
- `src/components/Sidebar.tsx` — shared sidebar and dummy profile.
- `src/layouts/AppLayout.tsx` — responsive shell and mobile navigation dialog.
- `src/components/ui/` — reusable visual components and Lucide icon wrapper.
- `src/data/navigation.ts` — navigation order and route metadata.
- `src/utils/` — class name composition and dialog focus containment.
- `src/index.css` — semantic Tailwind tokens matching the screenshot.

## Routes

| Page | Path |
| --- | --- |
| Company Overview | `/company-overview` |
| Entity Analytics | `/entity-analytics` |
| Departments | `/departments` |
| Sessions | `/sessions` |
| Code Traceability | `/code-traceability` |
| Usage & Cost | `/usage-cost` |
| Security Findings | `/security-findings` |
| Coverage & Health | `/coverage-health` |
| Users & Departments | `/users-departments` |
| Integrations | `/integrations` |
| Settings | `/settings` |
| Audit Logs | `/audit-logs` |

The root redirects to Company Overview. Unknown routes show Not Found. Production hosting must serve `index.html` for application paths to support BrowserRouter deep links.

## Accessibility and responsive behavior

The desktop sidebar starts at 1024px. Mobile navigation and session details use native modal dialogs, Escape dismissal, focus containment, and focus restoration. The shell includes a skip link, route-based `aria-current`, document titles, and visible keyboard focus indicators. The chart has an accessible text description for every daily observation. Tables have semantic headers and a keyboard-scrollable region on small screens. Reduced motion preferences are respected.

## Entity Analytics

Open http://localhost:5173/entity-analytics. Entity Analytics reuses the existing shell, design tokens, session-status component, state components, and session detail dialog without modifying Company Overview.

- Employee and Device selectors update the profile, totals, and associated sessions.
- Reporting periods are 7, 30, and 90 days, ending 12 November 2026; filters and tabs are retained in URL parameters.
- Overview shows the latest three sessions. View all sessions opens the entity's Sessions tab, with ten rows per page.
- Usage & Cost groups measured tokens and costs by agent. Security lists this entity's findings within the selected period.
- Tabs support Left/Right arrows, Home, and End. Entity actions open a details dialog or switch to Sessions/Security.
- Session IDs open the existing accessible session detail dialog.

Entity fixtures partition Company Overview's existing daily totals exactly. Maya's default 30-day totals are 186 sessions, 2.41M tokens, and $92.30. `SES-1083` remains Omar's and `SES-1082` remains Lina's; Maya uses distinct `SES-1080` and `SES-1079` records. Start times are derived from the existing last-activity timestamps and session durations.

State examples:

- `/entity-analytics?state=loading`
- `/entity-analytics?state=empty` — Show sample data restores the overview.
- `/entity-analytics?state=error` — Try again restores the overview.
- `/entity-analytics?entity=noor` — an active employee with no recorded sessions.
- `/entity-analytics?type=device&entity=DEV-002` — recorded sessions, but gateway token/cost attribution is Not Available.
- `/entity-analytics?type=device&entity=DEV-005` — device telemetry is Not Available.

Implementation is in `src/pages/EntityAnalyticsPage.tsx`, `src/components/entity/`, and `src/data/entityAnalytics.ts`.

Validation:

- `node --test scripts/entity-analytics.test.mjs` checks associations, session durations, shared totals for all date ranges, and unavailable versus zero values.
- `node scripts/entity-browser-check.mjs` checks browser interactions and desktop/mobile overflow using installed Chrome. It saves screenshots in ignored `.browser-qa/` and compares Company Overview against the saved `company-overview-before-entity.png` baseline.
- `scripts/browser-session.mjs` provides the browser-check helper without additional dependencies.

## Departments

Open http://localhost:5173/departments. The page reuses the existing shell and UI components without modifying the approved pages.

- Date ranges: 7, 30, and 90 days using the shared reporting end of 12 November 2026.
- Tokens/Cost switches chart values, heading, units, and axis labels. CSS bars have visible text equivalents.
- Every table column sorts ascending/descending, with missing measurements sorted last. Filters, metric, and sort order are retained in the URL.
- Department rows open a details dialog with the department's roster and aggregate values. Employee links open Entity Analytics for the same period.
- Export downloads a UTF-8 CSV with the current table order and selected period. Raw integer tokens and precise USD amounts are exported alongside scope dates, measurement availability, and a prototype-data label.

The existing roster has four Engineering employees and one Data & Analytics employee (displayed as Data). Product and Marketing have no assigned employees and show zero, rather than invented activity. All department session, token, and cost totals reconcile exactly to the existing company/entity data. Employee counts are roster counts and do not change with activity dates.

For 30 days: Engineering has 594 sessions, 5.87M tokens, and $226.10 estimated cost; Data has 690 sessions, 2.55M tokens, and $92.30 estimated cost. Combined totals are the approved 1,284 sessions, 8.42M tokens, and $318.40. The screenshot's contradictory statistics are intentionally not copied.

State examples:

- `/departments?state=loading`
- `/departments?state=empty` — Show sample data restores the report.
- `/departments?state=error` — Try again restores the report.
- `/departments?state=unavailable` — roster counts remain known, while activity measurements and CSV values show Not Available rather than zero.
- `/departments?department=product` — a department with no assigned employees.

Export is disabled during loading or an error. An empty report exports a header-only CSV. Missing measurements export as Not Available. Costs are estimates for company-provided API keys; token values represent LiteLLM measurements within the dummy dataset.

Implementation: `src/pages/DepartmentsPage.tsx`, `src/components/departments/`, and `src/data/departments.ts`.

Checks:

- `node --test scripts/departments.test.mjs` verifies cross-page totals, all sort columns, unavailable/zero values, axes, and CSV encoding/precision.
- `node scripts/departments-browser-check.mjs` verifies interaction behavior and the actual downloaded CSV using installed Chrome. It saves ignored screenshots in `.browser-qa/` and compares the approved pages against `company-before-departments.png` and `entity-before-departments.png` baselines.

## Sessions

Open http://localhost:5173/sessions. The page recreates `design-references/sessions.png` with a searchable session table and a selected-session investigation panel. The default selection is Lina's `SES-1082`.

- Search by session ID, employee, agent, or repository; combine Agent and Status filters.
- More Filters supports employee, repository, device, and minimum duration. Apply and Reset operate on the advanced filters; Escape dismisses the panel and restores focus.
- Reporting periods use the existing 7/30/90-day fixtures. The 30-day report contains all 1,284 records, so pagination has 129 pages, not the screenshot's illustrative 284 records / 29 pages.
- Ten records per page, except the last page. Session IDs sort descending by default. The table header toggles ascending/descending order.
- Select a row or session button to investigate it. Up/Down and Home/End on session buttons select neighboring visible rows. The selected row is pale green. Deselect session clears the detail panel.
- Timeline, Tool Calls, Files, and Prompts use the selected session's deterministic investigation fixture. Times are UTC and stay within the session duration. Prompts are sanitized demo summaries, never original user text.
- Generated long IDs are compacted in the table; their full canonical values remain in accessible labels, tooltips, URLs, and details.

Deep links:

- `/sessions?session=SES-1082`
- `/sessions/SES-1082` redirects to the same query-based view.
- Both forms retain date/filter/tab context. A bare link to an older record expands to 90 days when needed. An explicit period/filter mismatch offers Clear filters.
- The existing Company Overview and Entity Analytics session dialogs retain their previous information and controls, with an added Open in Sessions link that preserves their reporting period.

Data consistency:

- `src/data/sessions.ts` reuses the complete `entitySessions` dataset, employees, agents, and repositories.
- Known session IDs, employee ownership, and metadata are unchanged. Existing generated records now include deterministic Failed outcomes in addition to Completed and Interrupted; all shared screens use the same status model and distinct badges.
- Counts, token measurements, costs, and department totals remain unchanged. Session start times are derived from the existing last-activity timestamps and durations, rather than copying contradictory screenshot values.
- Failed writes are marked failed in Tool Calls and Files, with no claim that the update succeeded.

States: `/sessions?state=loading`, `/sessions?state=empty`, `/sessions?state=error`, `/sessions?session=none`, and `/sessions?session=missing-id`. Error retry and empty Reset filters restore local sample records. Searches with no matches have a meaningful empty state.

Implementation: `src/pages/SessionsPage.tsx`, `src/components/sessions/`, and `src/data/sessions.ts`. No extra dependencies, real APIs, or backend were added.

Checks:

- `node --test scripts/sessions.test.mjs` verifies filtering, pagination, period totals, canonical ownership, event/file/prompt consistency, and deep-link scope.
- `node scripts/sessions-browser-check.mjs` verifies UI filters, tabs, row selection, pagination, aliases, earlier-page links, state recovery, mobile layout, and all three previous page screenshots. Screenshots are saved under ignored `.browser-qa/`.

## Code Traceability

Open http://localhost:5173/code-traceability. The master-detail page is built from `design-references/code-traceability.png`; existing page components and shared data are unchanged.

- Commits, Pull Requests, Reviews, and Repositories display typed, related demo records, not placeholders.
- Search commits by full/short SHA, message, repository, or author. Search in other tabs covers relevant titles, people, and identifiers.
- Repository, date, author/reviewer, branch, link-status, and PR-state filters compose. More Filters supports Apply, Reset, Escape dismissal, and focus restoration.
- Commit, PR, and review tables use ten rows per page. Counts and pagination describe only actual fixtures: 40 commits for 30 days, 60 for 90 days, 10 PRs/reviews for 30 days, and four repositories.
- Select rows with a click or keyboard. Up/Down and Home/End on row buttons move between visible records. The close action deselects the record and restores focus.
- Details / Related Sessions tabs display changes, linked or candidate sessions, and explicit evidence. Linked session buttons open the existing Sessions route with the reporting period retained.
- The Merged badge is an interactive link to the supporting demo PR; PR details include its commits, merge timestamp, and reviews. Review details link to the PR. Repository details link to included commits.

Evidence and scope:

- `Verified (demo)` requires a synthetic collector event containing the exact full commit SHA, session ID, repository, author, and recording time. Source sessions exist in the shared dataset and completed before the demo commit.
- `Unverified (demo)` is a same-author/repository temporal candidate, not proof of AI authorship.
- `Unlinked (demo)` has no session association; it does not prove that AI was or was not used.
- A commit is Merged only when an associated demo PR includes that SHA and has both Merged state and an explicit merge timestamp. Other commits remain Committed.
- There is no connected GitHub integration. Synthetic SHAs are not claimed to exist on GitHub. External icons are explicitly labeled links to the validated public example history at https://github.com/octocat/Hello-World/commits/master/.
- Commit authors, linked-session employees, and repositories reuse the existing shared fixtures. The screenshot's 1,248 illustrative commits are not claimed to exist in this smaller dataset.

URLs retain filters, main tab, detail tab, selected row, and page. For example `/code-traceability?row=a7f3d9e&detail=Related+Sessions` opens the default commit's evidence. States: `?state=loading`, `?state=empty`, `?state=error`, and `?row=none` (no selection). Empty Reset filters and error Try again restore sample records.

Implementation: `src/pages/CodeTraceabilityPage.tsx`, `src/components/traceability/`, and `src/data/traceability.ts`. No extra dependencies or real APIs were added.

Checks:

- `node --test scripts/traceability.test.mjs` verifies unique SHAs, valid ownership/repositories, link evidence, explicit PR merge proof, search/date/filter behavior, and actual pagination counts.
- `node scripts/traceability-browser-check.mjs` checks UI filters, all tabs, evidence, merge inspection, session navigation, keyboard interactions, states, responsive layout, and byte-identical screenshots of all four earlier pages. Artifacts are ignored under `.browser-qa/`.

## Usage & Cost

Open http://localhost:5173/usage-cost. The Overview follows `design-references/usage-and-cost.png`; Model Requests shows a separate paginated request log using the same filters and summaries.

- Reporting periods: 7, 30, and 90 days, ending 12 November 2026.
- Employee, Department, and Model filters compose. More Filters supports Agent, Repository, Cost availability, and Request status, with Apply, Reset, Escape dismissal, and focus restoration.
- Summary cards, daily token trend, model breakdowns, percentages, request logs, and exports are all derived from the same filtered typed records.
- Model Usage Details sorts by model, requests, measured tokens, or estimated cost. The percentage switch hides/shows all three percentage columns and applies to the Overview CSV too.
- Model Requests supports sorting, ten records per page, and links to the existing Sessions detail route with the reporting period retained.
- URL parameters retain the selected tab, period, filters, percentage visibility, sorting, and page.

Data accuracy:

- Each existing shared session is split into four or five deterministic gateway request fixtures. Tokens are apportioned exactly once across those requests, with timestamps inside the source session. Request IDs are unique.
- The 30-day scope contains exactly 5,382 request records, 8,420,000 gateway-measured tokens, and a $318.40 known company-key estimated subtotal. Each session, employee, department, and reporting period reconciles to the earlier shared data.
- The model request counts are 2,373 / 1,468 / 770 / 771 in the default 30-day view, totaling 5,382. Contradictory screenshot request breakdowns are intentionally not reproduced.
- Personal-key request fixtures have measured gateway tokens but no available cost basis. Their estimated cost is null and displayed/exported as Not Available, never zero. The default view has 771 such requests.
- Existing company-key session estimates are allocated only to company-key requests. The $318.40 card is explicitly a known subtotal, not a complete estimate of personal-key traffic and not a billed charge. Costs are dummy allocations, not current provider pricing.
- Request percentages use all filtered requests; token percentages use known measured gateway tokens; cost percentages use only known company-key estimates. Largest-remainder rounding ensures each defined percentage group totals exactly 100.0%. Missing denominators or costs display a dash rather than a fabricated percentage.
- The trend plots actual daily measured totals. Its scale differs from the reference's illustrative multi-million daily values so its points sum to the displayed period total.
- Usage is attributed to existing employee/session/repository records. This page does not assert device-level gateway measurement mappings.

Exports:

- Overview exports the current sorted model breakdown, optional percentage columns, raw tokens, precise USD known estimates, cost-coverage counts, scope dates, and a prototype-data label.
- Model Requests exports every matching filtered record in its current sort order, including session, employee, department, model, agent, repository, UTC time, raw tokens, estimate, cost basis, and status. Export is not restricted to the visible page.
- CSV files use UTF-8 BOM and CRLF. Export is disabled during loading/errors; unavailable metrics remain Not Available.

States: `/usage-cost?state=loading`, `?state=empty`, `?state=error`, and `?state=unavailable`. The unavailable state retains request log counts but suppresses unavailable tokens/costs and does not plot them as zero. `/usage-cost?model=gpt-4o-mini` demonstrates observed tokens with unavailable costs. `/usage-cost?employee=noor` demonstrates an employee with no gateway requests.

Implementation: `src/pages/UsageCostPage.tsx`, `src/components/usage/`, and `src/data/usageAndCost.ts`. Existing pages, layout, shared components, and data are unchanged; no dependencies, real APIs, backend, or database were added.

Checks:

- `node --test scripts/usage-and-cost.test.mjs` verifies per-session and cross-page totals, ownership, composed filters, correct percentage denominators/rounding, null costs, sorting, pagination, daily series, and CSV content.
- `node scripts/usage-and-cost-browser-check.mjs` verifies both tabs, filters, chart updates, percentage visibility, sorting, downloaded CSV files, request navigation, states, keyboard behavior, responsive layout, and byte-identical screenshots for all five earlier pages. Artifacts remain ignored under `.browser-qa/`.

## Security Findings (page 7)

Open `/security-findings` to investigate the shared prototype findings. The reference's queue and investigation/review layout is implemented with React, using five records per queue page. Search, severity, agent, review status, repository, employee, department, assignment, evidence availability, and 7/30/90-day date filters compose together. Details, Evidence, Activity, and Context tabs display the selected finding's own information. Candidate session and repository links use existing routes.

The page extends the existing 12 finding records without changing their IDs, ownership, severities, timestamps, or canonical reporting titles. Expanded investigation titles describe the synthetic samples. Counts therefore differ from the screenshot's eight illustrative records. Initial statuses are Open to agree with existing reporting fixtures. Review changes are local to this page's mounted React state and reset on reload or leaving the page; approved reporting pages retain their original snapshots.

Administrator can start a review, add notes, mark as reviewed, reopen, and assign an existing demo employee. Each action updates status/assignment, counts, and activity history with visible feedback. Resolved means reviewed in this prototype; it does not confirm remediation. The `?role=viewer` URL parameter previews Viewer permissions: viewing/filtering remains available while all write controls are disabled and guarded in the action handler. The role selector is not displayed on the page. This is not authentication. No live scans, incidents, integrations, or security-system updates are claimed.

Evidence consists only of explicitly synthetic redacted samples or missing artifacts. Employee/device/time matching produces an **unverified candidate** session, never a verified finding-to-session association. Missing evidence is shown as Not Available. No secrets or real prompts are included.

State previews: `/security-findings?state=loading`, `?state=empty`, `?state=error`, `?finding=none`, `?finding=missing`, `?role=viewer`, and `?finding=FND-13&detail=Evidence` (missing evidence). Date ranges end on the shared fixture date, November 12, 2026. Existing `/security-findings?severity=critical` links remain supported.

Implementation: `src/pages/SecurityFindingsPage.tsx`, `src/components/security/`, and `src/data/securityFindings.ts`; routing added in `src/App.tsx`. No dependencies added. Checks: `node --test scripts/security-findings.test.mjs` and `node scripts/security-findings-browser-check.mjs` (requires local Chrome and a running Vite server). Browser artifacts are ignored under `.browser-qa/`.

## Coverage & Health (page 8)

Open `/coverage-health` to inspect Local Collectors, LiteLLM Gateway, and GitHub Integration. The approved reporting-sources/detail layout is built with React components. Search matches source names, source descriptions, collection issues, and local device names. Health summary pills filter the source list; the existing `?filter=issues` Company Overview link scopes it to sources with issues. Selecting a source updates its current demo health, last successful observation, reporting history, related issue, and expandable Monitoring Limitations. The date selector changes 7/30/90-day observed counts and history; health remains a current snapshot, as it does on Company Overview.

Data consistency and intentional reference differences:

- Company Overview already reports three collection issues and delayed LiteLLM reporting. This page preserves that snapshot: one healthy source and two delayed sources, with issues for missing device telemetry, delayed gateway usage, and delayed GitHub sync. It does not reproduce the reference's conflicting two-healthy/one-delayed totals.
- Local Collectors uses the existing four reporting devices out of five demo devices, rather than inventing the screenshot's 86 devices. The healthy collector heartbeat does not imply complete telemetry: the unavailable legacy device remains explicitly Not Captured.
- Period session/request/token counts are derived from the existing shared fixtures and reconcile with earlier pages. Non-gateway token measurements and unavailable source observations are null and rendered Not Available, never zero. An observed empty result and missing observation are distinct.
- GitHub remains a static, disconnected-from-real-services prototype. Its connection label is Demo configured, rather than claiming a live Connected integration. Relative observation times use a fixed demo clock after the existing records. Reporting history events are synthetic heartbeat/delay fixtures, distinct from underlying session/request/GitHub record counts.
- Monitoring Limitations expands to show the selected coverage scope, measurements, missing/unsupported activity caveats, and snapshot timestamp. No Refresh/Recheck action was present in the reference, so no simulated or real service-check operation was added. There is no visible role selector.

Existing issue links navigate to the unavailable device in Entity Analytics, filtered-period Usage & Cost, or Code Traceability. Keyboard Arrow Up/Down and Home/End select sources. Native history disclosure, health filters, search, date selector, close selection, limitations disclosure, state recovery, and links support keyboard focus. Mobile panels stack vertically.

Preview URLs: `?state=loading`, `?state=empty`, `?state=error`, `?source=none`, `?source=missing`, `?state=unavailable&source=litellm`, `?state=not-configured&source=github`, and `?state=degraded&source=collectors`. `?role=viewer` demonstrates read-only inspection without configuration controls or authentication. All monitoring information is demo-only; no API, connection, configuration, or backend changes occur.

Files: `src/pages/CoverageHealthPage.tsx`, `src/data/coverageHealth.ts`, `src/components/coverage/`, and the route in `src/App.tsx`. No dependencies added. `node --test scripts/coverage-health.test.mjs` checks fixture consistency, period totals, composable filters, health derivation, and null measurements. `node scripts/coverage-browser-check.mjs` checks interactive behavior, issue navigation, states, responsive layout, and byte-identical screenshots of pages 1–7. The browser check requires local Chrome and the Vite server; `--baseline` records prior-page screenshots before changes. Artifacts remain ignored under `.browser-qa/`.

## Users & Departments (page 9)

Open `/users-departments`. The approved administration layout includes Users, Departments, Roles & Permissions, and Access Policies views, with a selected-user panel and permission overview. Users can be searched by name, email, or existing employee ID; role, department, and status filters compose together. The table shows five users per page with real filtered counts. Selecting a row updates details without navigation. Keyboard Arrow Up/Down and Home/End select users; the administration tabs support Arrow Left/Right and Home/End.

The directory is seeded once from the existing five employees and four departments. Employee IDs, names, emails, job titles, statuses, and initial department memberships are preserved. Access roles are a separate typed field (Administrator, Department Manager, Viewer), not a replacement for an employee's job title. This intentionally differs from the reference's 24 illustrative users and unrelated names/roles/departments. New local users have no fabricated telemetry employee ID or sessions.

Administrator can add and edit users, including roles and department membership. Forms validate required name, email format and case-insensitive uniqueness, existing departments, supported roles, and field lengths. Disabling or re-enabling an account requires confirmation; cancellation makes no change, and stale status confirmations are rejected. Every successful operation updates React state, feedback, and per-user local activity. Inactive users have all demo permissions marked Not allowed. The details menu offers Edit user, Disable/Re-enable account, and View local activity.

Departments displays memberships and active counts from the same current directory state; edits appear immediately in the user table, selected user, and department member lists. Roles & Permissions shows typed role defaults; Access Policies explains the demo rules. They do not configure real policies or authorization.

Directory changes are local to this mounted page and reset on reload or navigation away. Earlier approved analytics pages are fixed historical snapshots and retain original department attribution and mock entities. No shared employee or session fixture is mutated. No real account, invitation, role grant, access revocation, authentication, or backend operation is performed.

Permission previews use the existing page-local URL convention without adding a visible demo-role selector: `/users-departments?role=viewer` is read-only; `?role=manager&scope=data` exposes only the Data & Analytics department's users and denies all user-management writes. Manager scope cannot be expanded by filters or direct user IDs. The default Administrator is the sidebar's demo actor Omar Allahham, distinct from employee Omar Saleh. Mutation handlers re-read the current preview role and use the same pure permission guard as validation tests. These URL previews are not security boundaries or real authentication.

States: `?state=loading`, `?state=empty`, `?state=error`, `?user=none`, `?user=missing`, or an unmatched search. The error and empty states recover through Try again and Reset filters. Dialogs support Escape, focus restoration, labels, error associations, and trapped Tab navigation. Tables scroll inside their cards on small screens; the details panel stacks below the list.

Files: `src/pages/UsersDepartmentsPage.tsx`, `src/data/userDirectory.ts`, `src/components/users/`, plus the new route in `src/App.tsx`. The new page is loaded as a separate bundle. No dependencies added. `node --test scripts/user-directory.test.mjs` checks identity consistency, composed filters, pagination, validation, role/department changes, status transitions, immutable historical fixtures, and permission enforcement. `node scripts/users-browser-check.mjs` exercises the UI, dialogs, all four tabs, scoped read-only previews, mobile layout, and byte-identical screenshots of all eight earlier pages. It requires local Chrome and the running Vite server; `--baseline` captures prior-page screenshots before changes. Artifacts are ignored in `.browser-qa/`.

## Integrations (page 10)

Open `/integrations` to review Local Collector, LiteLLM Gateway, and GitHub App. The approved service-list and detail-panel layout includes Overview, Repositories, and Connection Events tabs, connection-status filters, Documentation, and selected-source Coverage & Health navigation. Source selection and tabs support keyboard arrows and Home/End. Repository links navigate to existing Code Traceability repository details. Documentation opens local prototype guidance; it does not launch or contact an external service.

Integration setup/reporting data is derived from the existing `reportingSources` records. Initial configurations are Connected (demo), with collector reporting Healthy and LiteLLM/GitHub reporting Delayed, matching Coverage & Health and Company Overview. Integrations summarizes three Connected configurations; reporting health appears only in Coverage & Health. Device and repository scope and last observations come from existing fixtures. Connected is explicitly a simulated setup state, never proof of live connectivity or complete telemetry. GitHub remains unconnected to any real service.

A compact details menu supplements the reference with Administrator-only Configure/Connect demo, Test/Retry demo check, and Disconnect demo actions. Connect/configure uses predefined workspace and outcome selections plus existing GitHub repository checkboxes. There are no text, credential, token, key, URL, or password inputs. Validation accepts only whitelisted choices and rejects empty GitHub scope. Disconnect requires confirmation; Cancel leaves state unchanged. Simulated checking is visibly pending for 800 ms and produces an explicit demo success/error result. It never refreshes observed telemetry or clears collection delay warnings. Local changes produce labeled activity events and feedback; no remote service or backend is contacted.

Disconnected, Error, and Not Configured configurations project unavailable current observations into Coverage & Health. Configuration is shared across the two pages and persists in the browser tab session. Connection Events contains local configuration/check activity only. Fixed underlying reporting fixtures and all earlier analytics snapshots remain unchanged.

The existing page-local URL role convention is reused: `?role=viewer` and `?role=manager` allow inspection but disable all global configuration actions; direct action handlers enforce the same role rules and recheck the current role when a pending check completes. No visible demo-role selector, authentication, authorization backend, or real access grant/revocation was added.

State previews: `?state=loading`, `?state=empty`, `?state=error`, `?source=none`, `?source=missing`, `?state=not-configured`, `?state=disconnected`, and `?state=connection-error`. `?check=error` makes the next simulated check return a demo error. Only GitHub is overridden by the three connection-state previews. All supported reporting records remain demo-only. Small-screen panels stack; dialogs trap focus, support Escape, restore focus, and fit the viewport.

Files: `src/pages/IntegrationsPage.tsx`, `src/data/integrations.ts`, `src/components/integrations/`, plus a lazy-loaded route in `src/App.tsx`. No dependencies added. `node --test scripts/integrations.test.mjs` checks Coverage consistency, whitelisted setup values, local state transitions, immutable baseline observations, and Administrator/Viewer/Manager permissions. `node scripts/integrations-browser-check.mjs` checks tabs, filters, source/repository navigation, configure/connect/disconnect/cancel/check/retry, validation, states, read-only roles, keyboard/mobile behavior, and byte-identical screenshots of pages 1–9. The browser check requires local Chrome and a running Vite server; `--baseline` records earlier-page screenshots before changes. Artifacts stay ignored in `.browser-qa/`.


## Shared source configuration and reporting health

Integrations now manages connection setup and status only. Coverage & Health owns reporting health, observations, delays, missing telemetry, collection issues, and limitations. The existing cards, spacing, typography, sidebar, source IDs, and page routes are retained. Integrations uses Connected / Disconnected / Error / Not Configured labels; the former Sync Events tab is Connection Events and contains only local configuration/check activity. Reporting-delay notices and latest received events no longer appear in Integrations.

Selected-source links:

- View Reporting Health: `/coverage-health?source=<id>`.
- View Integration Settings: `/integrations?source=<id>`.

Both links preserve whitelisted role, department scope, reporting period, and explicit scenario parameters. Viewer and Department Manager remain read-only, including after navigation through footer and connection-issue links. Browser back/forward and direct URLs select the source from the query; unknown IDs show a non-destructive empty detail state.

`src/data/sourcePrototype.ts` projects the existing reporting records and integration configuration through stable IDs: collectors, litellm, and github. `sourcePrototypeStore.ts` shares mutations with React's external-store hook and sessionStorage. Connection changes persist across SPA navigation and full reloads within the tab. Disconnected/Error configurations have no current observations; Not Configured has no current collection history. Null metrics render Not Available, never zero. Successful reconnect/check does not clear existing reporting delays or claim complete capture. GitHub scope follows the shared configured repository IDs; period totals keep historical fixture attribution. All unrelated pages retain their approved fixed snapshots.

Only validated, non-secret configuration enums and existing repository IDs are persisted under `menaiq-source-prototype-v1`. No credentials, keys, tokens, arbitrary configuration text, or event messages are saved. Local action history remains in memory across SPA navigation but resets on full reload; unavailable configuration-event timestamps are labeled Not Available. If sessionStorage is disabled, sharing still works in memory but resets on reload. This is not backend state, real authorization, live telemetry verification, or cross-tab synchronization.

Explicit scenarios work on both source pages and travel with their navigation links:

- `?source=github&scenario=github-healthy`: Connected + Healthy.
- `?source=github&scenario=github-delayed`: Connected + Delayed.
- `?source=litellm&scenario=litellm-degraded`: Connected + Degraded.
- `?source=github&scenario=github-disconnected`: Disconnected, current reporting unavailable.
- `?source=github&scenario=github-not-configured`: Not Configured, no current reporting.
- `?source=github&scenario=github-error`: connection Error, distinct from reporting delay.

Scenarios are explicit URL-based demo views. Successful configuration actions commit the resulting shared state and remove the current scenario/connection-preview override. Original loading/empty/error previews remain supported. Default observations and collection warnings still derive from the existing Company Overview/reporting fixtures; no live checks or guarantees are implied.

Validation: `node --test scripts/source-prototype.test.mjs`, `node scripts/source-navigation-browser-check.mjs`, `npm.cmd run build`, and `npm.cmd run lint`. The browser suite covers requested A-J states, disconnect/reconnect across direct loads, permission-preserving links, history, invalid IDs, mobile layout, and byte-identical screenshots for the eight unrelated pages. Existing Integrations workflow tests were updated for connection-only terminology. Settings and Audit Logs remain placeholders.
