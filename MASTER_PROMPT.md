# MASTER PROJECT PROMPT — AKATA LIFE
## Private Life Management Platform | Full-Stack Application | VPS Deployment

You are my senior full-stack software engineer, solution architect, UI/UX designer, security engineer, DevOps engineer, and QA engineer.

Your task is to design and build a real, production-oriented, self-hosted personal management application called **Akata Life**.

This is not a demo, a static dashboard, or a disposable prototype. Build a maintainable application that I can use personally, extend over time, and operate on my own VPS.

I want to manage my household, contracts, finances, documents, recurring payments, important dates, and home automation information from one secure interface.

I will use Google Antigravity to develop this project and GitHub to maintain its source code. I may use Cursor or another coding assistant later, so the project must have clean architecture, comprehensive documentation, and straightforward development workflows.

## 1. Working principles

Follow these rules throughout the project:

1. Inspect the current workspace, existing Git repository, available tools, and project structure before making changes.
2. If a project already exists, preserve it and understand it before editing anything.
3. Work in small, independently testable milestones.
4. Implement working features rather than merely producing plans, mockups, or placeholder pages.
5. Do not claim a feature works until you have tested it.
6. Never invent credentials, server configuration, domain names, API keys, or existing infrastructure.
7. Ask me before performing destructive operations, deleting data, changing production configuration, or exposing services publicly.
8. Do not modify my existing VPS or its unrelated services without explicit approval.
9. Do not deploy to production automatically. First build, test, document, and prepare a deployment plan.
10. If information is missing, make safe, reversible development assumptions, document them, and ask questions only when necessary.
11. If a command fails, investigate and fix the actual cause rather than repeatedly applying unverified workarounds.
12. Keep a persistent project roadmap and update it after completing each milestone.

First inspect the workspace and create a project implementation plan. Then begin implementation instead of stopping after presenting the plan.

---

## 2. Product vision

Create one private application that serves as my personal household administration system.

Working title: **Akata Life**

Default interface language: German.

Additional interface language: Turkish.

Primary devices:
- iPhone
- Desktop and laptop computers
- Tablets

The application should be responsive and installable on an iPhone through a Progressive Web App (PWA).

The design should feel like a modern, premium personal finance and home management application: clean typography, excellent spacing, intuitive navigation, elegant charts, accessible forms, and a consistent design system.

Avoid cluttered admin templates, excessive gradients, unnecessary animations, and oversized cards.

Provide light and dark themes.

Use German localization conventions by default:
- Date format: DD.MM.YYYY
- Currency: EUR
- Decimal separator: comma
- Time zone: Europe/Berlin

All displayed financial amounts must use proper German number formatting.

## 3. Recommended technical architecture

Use the following stack unless inspection reveals a compelling technical reason to change it. Document and justify any deviation before introducing a major architectural change.

### Frontend
- Next.js with App Router
- TypeScript with strict type checking
- React
- Tailwind CSS
- shadcn/ui or an equivalent accessible component system
- Lucide icons
- Recharts for data visualization
- React Hook Form and Zod for form validation

### Backend
- Next.js server-side application and API endpoints
- PostgreSQL
- Prisma ORM with version-controlled migrations
- A maintained authentication library compatible with the selected Next.js version
- Server-side authorization for every protected resource and mutation

### Infrastructure
- Docker
- Docker Compose
- PostgreSQL in a private container network
- A production-ready reverse proxy using HTTPS
- Environment variables and secrets outside source control
- Persistent storage for uploaded documents
- Automated database and file backups
- Health checks and structured application logs

### Development quality
- ESLint
- Prettier
- TypeScript checks
- Unit tests
- Integration tests
- End-to-end tests using Playwright
- Dependency and container vulnerability checks

Use stable, mutually compatible dependency versions. Commit the lockfile. Do not use deprecated packages or automatically install arbitrary latest versions without checking compatibility.

Keep the architecture modular. Do not introduce microservices unless a demonstrated requirement justifies them.

---

## 4. Application navigation

Create a persistent, responsive sidebar on desktop and an appropriate mobile navigation system.

Main navigation:

1. Dashboard
2. Verträge
3. Dokumente
4. Finanzen
5. Einnahmen
6. Ausgaben
7. Rechnungen
8. Termine & Erinnerungen
9. Mein Zuhause
10. Geräte & Energie
11. Berichte
12. Einstellungen
13. Backup & Systemstatus

Only show navigation items for implemented features. Clearly distinguish functional features from planned features.

Every page must have meaningful empty states, loading states, error states, and useful validation messages.

## 5. Dashboard

Build a real dashboard backed by database records.

Display:
- Current month's income
- Current month's expenses
- Remaining monthly budget
- Recurring monthly commitments
- Upcoming bills
- Contracts approaching their cancellation or renewal dates
- Recently added documents
- Upcoming reminders
- Household energy information when integration is configured

Provide date-range filters and monthly summaries.

Charts must use actual stored data. Never generate fake financial figures and present them as real data.

When the database is empty, show helpful onboarding guidance and an option to add the first records.

Users should be able to click a dashboard item to open the relevant detail page.

## 6. Contracts — Verträge

Create a complete contract management module.

Examples:
- Electricity
- Gas
- Water
- Internet
- Mobile phone
- Insurance
- Rental agreement
- Vehicle insurance
- Vehicle financing
- Subscriptions
- Other household agreements

Each contract should support:
- Provider or company
- Contract category
- Contract number, optional
- Start date
- Minimum contract period
- Notice period
- Cancellation deadline
- Renewal date
- Monthly or annual price
- Billing frequency
- Payment method description
- Contract status
- Contact details
- Notes
- Related documents
- Reminder settings

Features:
- Create, view, edit, archive, and delete contracts.
- Search and filter by provider, category, status, and deadline.
- Sort by upcoming cancellation dates.
- Display upcoming deadlines clearly.
- Generate reminder records from configured contract dates.
- Link invoices and supporting PDFs to contracts.
- Export contract metadata as CSV or JSON.

Do not automatically cancel contracts or contact providers. Such actions require explicit user approval and a separately implemented integration.

Support both German and Turkish interface labels.

## 7. Document management

Build a private document library.

Document categories:
- Contracts
- Electricity and gas bills
- Internet and mobile bills
- Insurance
- Rent and housing
- Employment and payslips
- Tax documents
- Jobcenter and public administration
- Vehicle documents
- Warranties and receipts
- Other personal documents

Each document should support:
- Original filename
- User-defined title
- Category
- Issue date
- Relevant due date
- Upload date
- Optional amount
- Related contract
- Tags
- Notes
- File type and size

Required functionality:
- Upload PDFs and permitted image formats.
- Preview supported files safely.
- Search and filter document metadata.
- Download authorized files.
- Replace a file without losing the intended document record.
- Archive and delete documents with appropriate confirmation.
- Show related contracts and invoices.

Security requirements:
- Never expose the upload directory as a public static directory.
- Validate file extensions, MIME types, and actual file contents.
- Generate internal storage names rather than trusting uploaded filenames.
- Enforce file-size limits.
- Prevent path traversal and unauthorized downloads.
- Store files outside the application source directory.
- Protect against malicious files and unsafe document previews.
- Keep sensitive document URLs private and authorization-protected.

Implement document retention and deletion behavior carefully. Backups must not be confused with the active document library.

OCR and automatic document classification are future features, not prerequisites for the first release.

## 8. Household finances

Build a personal household budgeting module.

### Income categories
- Salary
- Child benefit (Kindergeld)
- Government benefits
- Other household income
- Other income

### Expense categories
- Rent
- Gas and heating
- Water
- Electricity
- Internet
- Mobile phone
- Insurance
- Transport
- Groceries
- Household purchases
- Subscriptions
- Financing payments
- Other expenses

Allow users to customize all categories.

Each transaction should support:
- Description
- Amount
- Currency
- Transaction date
- Income or expense type
- Category
- Optional account or payment source
- Optional related contract
- Optional invoice or document
- Notes
- Recurring transaction configuration

Features:
- Monthly and annual overviews
- Income versus expense charts
- Category breakdowns
- Budget limits
- Remaining budget calculations
- Recurring payment schedules
- Search and filtering
- CSV export
- Historical monthly comparisons

### Financial data integrity

Use precise decimal or integer minor-unit arithmetic. Never use floating-point arithmetic for financial calculations.

Use EUR as the initial supported currency.

Store transaction dates and timestamps consistently, respecting the Europe/Berlin time zone.

Keep historical transactions unchanged when a category name or display setting changes.

Clearly distinguish:
- Planned payments
- Recorded transactions
- Confirmed payments

Do not assume that a planned transaction was actually paid.

Do not connect to bank accounts or initiate payments in the initial release.

## 9. Invoices and recurring bills

Build an invoice and payment tracking module.

Fields:
- Invoice description
- Provider
- Invoice number, optional
- Invoice date
- Due date
- Gross amount
- Status: planned, unpaid, paid, overdue, or cancelled
- Payment date, optional
- Related contract
- Attached document
- Notes

Provide a monthly calendar and list view.

Automatically calculate overdue status from the due date and recorded payment status.

Allow recurring bill templates to create planned invoice records according to their configured schedule.

Do not mark invoices as paid automatically unless a verified payment record is explicitly entered or a future authorized integration confirms it.

## 10. Calendar and reminders

Build a reliable reminders module.

Support:
- Contract cancellation deadlines
- Invoice due dates
- Insurance renewals
- Warranty expiration
- Document renewal dates
- Custom personal reminders

Each reminder should support:
- Title
- Description
- Due date and time
- Priority
- Related entity
- Completion status
- Repeat interval, optional
- Notification preferences

Start with in-app reminders.

Design notification delivery so email or another notification channel can be added later. Do not claim that email, push notifications, or background scheduling works unless it is implemented and tested.

Recurring reminders must not generate duplicates on repeated processing.

Use a reliable scheduled-job mechanism when background scheduling is introduced.

## 11. My Home — Mein Zuhause

Create a home information module.

Store:
- Property or rental details
- Rooms
- Household assets
- Appliances
- Purchase dates
- Warranty periods
- Manuals
- Receipts
- Maintenance history
- Maintenance reminders
- Optional meter readings

Allow assets to be linked to documents and rooms.

Provide a useful inventory search and filters.

Keep household records independent of Home Assistant so that the application remains functional when Home Assistant is unavailable.

## 12. Home Assistant integration

Prepare a modular, optional integration with my existing Home Assistant installation.

Potential information to display:
- Indoor temperature
- Heating status
- Thermostat target temperature
- Gas consumption, when a suitable source exists
- Electricity consumption, when a suitable source exists
- Selected sensor values
- Energy cost estimates

Requirements:
- Home Assistant integration must be disabled until explicitly configured.
- Never invent entity IDs, API tokens, sensor availability, or energy readings.
- Use environment variables or a secure server-side configuration mechanism for integration secrets.
- Never expose Home Assistant long-lived access tokens to the browser.
- Never commit tokens or private Home Assistant configuration to GitHub.
- Use server-side requests and strict authorization.
- Apply request timeouts and sensible error handling.
- Display the last successful synchronization time.
- Clearly label estimated costs and identify the source of each measurement.
- Treat missing or stale sensor data as unavailable rather than displaying it as current.
- Read-only integration is the initial requirement.

Do not issue commands to heating systems or other home devices in the initial release.

## 13. Authentication and privacy

This application is intended for personal and household data.

Implement:
- Secure login
- Secure session management
- Password hashing using a modern password-hashing algorithm
- Multi-factor authentication support, preferably TOTP
- Login rate limiting
- Session revocation and logout
- Password reset with a secure token flow if email delivery is configured
- Server-side authorization checks
- Secure cookies
- CSRF protection where applicable
- Security headers
- Input validation
- Protection against SQL injection and cross-site scripting
- Safe error handling that does not expose secrets

Initially, create a private single-user application with an owner account.

Design the data model so that household members or additional users could be supported later, but do not expose registration publicly.

Never create a public demo account with access to real personal data.

Never hardcode a production password or use example credentials in a production environment.

Store secrets outside the repository.

For sensitive data, assess whether application-level encryption is needed. If implemented, document key storage, rotation, backup, and recovery. Do not claim that the entire database is encrypted merely because HTTPS is enabled.

Include privacy-conscious logging and an audit trail for important security-sensitive operations.

Provide a basic privacy and data export/deletion workflow appropriate for a private household application.

## 14. Database and data model

Design a normalized relational schema with appropriate foreign keys, indexes, uniqueness constraints, and deletion policies.

Initial entities may include:
- User
- Session
- Authenticator
- Contract
- Document
- Transaction
- Budget
- Invoice
- RecurringRule
- Reminder
- Property
- Room
- HouseholdAsset
- MaintenanceRecord
- HomeAssistantConnection
- AuditEvent
- ApplicationSetting

Use database migrations for all schema changes.

Add seed data only for development and automated tests.

Never seed fake household records into production.

Do not store passwords, API tokens, or session secrets in ordinary application settings without appropriate protection.

## 15. UI/UX quality

Create a coherent, modern interface with:
- Responsive desktop sidebar
- Mobile navigation
- Consistent page headers
- Search and filter components
- Accessible dialogs
- Reusable form fields
- Toast notifications
- Confirmation dialogs for destructive actions
- Clear status labels
- Empty states
- Helpful error messages
- Loading indicators
- Keyboard accessibility
- Proper contrast
- Light and dark modes

Use German as the default language and Turkish as an optional language.

Keep translations in dedicated localization files rather than scattering literal text throughout components.

Format dates, currencies, and numbers according to the selected locale.

Do not rely on color alone to communicate payment status or errors.

Avoid excessive animation and heavy visual effects.

## 16. PWA and iPhone support

Make the application installable as a PWA.

Requirements:
- Web app manifest
- Appropriate app icons
- Responsive layouts
- Safe-area support for modern iPhones
- Mobile-friendly forms and navigation
- Installability over HTTPS
- Clear online/offline status

Initially, sensitive financial and document data must not be cached in public or persistent service-worker caches.

Do not implement offline writes or local financial-data synchronization in the first release.

The application should remain usable from the browser even if PWA installation is unavailable.

## 17. GitHub workflow

Create a clean repository structure.

Include:
- README.md
- ROADMAP.md
- ARCHITECTURE.md
- SECURITY.md
- DEPLOYMENT.md
- BACKUP_RESTORE.md
- CONTRIBUTING.md
- CHANGELOG.md
- .env.example
- Dockerfile
- docker-compose.yml
- Database migrations
- Tests
- CI workflow

The repository must never contain:
- Real passwords
- API tokens
- Personal documents
- Actual payslips
- Real invoices
- Production database dumps
- Private SSH keys
- Sensitive environment files

Add a suitable .gitignore.

Use meaningful commits and small changes.

Before each milestone is considered complete:
1. Run formatting and lint checks.
2. Run TypeScript checks.
3. Run relevant automated tests.
4. Review the change for security issues.
5. Update the documentation.
6. Report exactly what passed and what failed.

Do not report tests as passed when they were not executed.

## 18. VPS deployment

Prepare the application for deployment using Docker Compose.

The production deployment should include:
- Web application
- PostgreSQL
- Persistent private document storage
- Health checks
- Database migrations
- Restart policies
- Appropriate resource limits where supported
- Structured logs
- Backup and recovery instructions

Use a reverse proxy for HTTPS.

Do not expose PostgreSQL directly to the public internet.

Do not bind application administration or database management ports publicly unless there is a documented, justified requirement and additional protection.

Do not assume a particular domain, Linux distribution, proxy, VPS provider, network address, or existing port configuration.

Before deployment:
1. Inspect the target environment using non-destructive checks.
2. Identify existing services, listening ports, Docker networks, reverse proxy, and available storage.
3. Confirm the operating system and deployment prerequisites.
4. Propose the required DNS and HTTPS configuration.
5. Identify any potential port conflicts.
6. Prepare a deployment and rollback plan.
7. Ask for approval before making production changes.

Never overwrite an existing Docker Compose project or reverse-proxy configuration without explicit approval.

Never run destructive commands such as broad Docker volume deletion or indiscriminate system cleanup.

Keep the database and uploaded files persistent across container rebuilds and application upgrades.

## 19. Backup and disaster recovery

Implement and document:
- Scheduled PostgreSQL backups
- Backups of uploaded documents
- Backup integrity checks
- Retention policies
- Restore procedures
- Recovery verification
- Protection of backup files and credentials

Use encrypted off-site backups where practical.

Keep backups separate from the production VPS when possible.

Document how to restore the complete application on a replacement VPS.

Do not consider a backup system complete merely because a backup command succeeded. Include a tested restore procedure.

## 20. Testing requirements

Create automated tests for critical business logic.

At minimum, test:
- Authentication and unauthorized access
- Contract creation and editing
- Cancellation deadline calculations
- Transaction totals
- Budget calculations
- Decimal arithmetic
- Invoice payment status
- Recurring transaction generation
- Reminder deduplication
- Document access authorization
- Upload validation
- Home Assistant failure handling
- Locale-specific formatting
- Database migrations
- Backup restoration procedure

Add end-to-end tests for the main user journey:

1. Log in.
2. Create a contract.
3. Upload a related document.
4. Add a recurring bill.
5. Record income and expenses.
6. Verify the dashboard totals.
7. Create a reminder.
8. Log out.
9. Verify that protected pages are inaccessible without authentication.

Use isolated test data and a test database.

Never run destructive tests against production data.

## 21. Implementation roadmap

Work through these milestones in order.

### Milestone 0 — Inspection and planning
- Inspect the workspace and repository.
- Identify current environment constraints.
- Create ROADMAP.md and ARCHITECTURE.md.
- Confirm the proposed architecture.
- List unresolved deployment questions.
- Do not alter production infrastructure.

Deliverable: approved technical plan and repository structure.

### Milestone 1 — Foundation
- Initialize the application.
- Configure TypeScript, styling, and reusable UI components.
- Set up PostgreSQL and Prisma.
- Implement database migrations.
- Implement authentication and authorization.
- Add Docker development configuration.
- Create the responsive application shell.
- Add German and Turkish localization.
- Configure automated checks.

Deliverable: a secure application foundation that can be run locally.

### Milestone 2 — First usable release
- Implement the dashboard.
- Implement contracts.
- Implement private document storage.
- Implement income and expense transactions.
- Implement invoices and basic recurring bills.
- Implement reminders.
- Connect dashboard summaries to real database records.

Deliverable: a usable personal household management application.

### Milestone 3 — Household management
- Implement property information.
- Implement rooms and household assets.
- Implement warranties and maintenance records.
- Add document relationships and search.
- Improve calendar and reporting.

Deliverable: complete core household record management.

### Milestone 4 — Quality and security
- Expand unit, integration, and end-to-end tests.
- Audit authentication and authorization.
- Review file upload security.
- Verify error handling and logging.
- Implement backup procedures.
- Test recovery in an isolated environment.

Deliverable: tested release candidate with documented limitations.

### Milestone 5 — VPS deployment
- Inspect the actual VPS.
- Prepare Docker Compose production configuration.
- Configure HTTPS and the domain after confirmation.
- Configure persistent storage and backups.
- Deploy only after approval.
- Run production smoke tests.
- Document update and rollback procedures.

Deliverable: securely deployed application accessible through the configured domain.

### Milestone 6 — Home Assistant
- Add an optional connection settings page.
- Implement secure server-side access.
- Display configured sensor readings.
- Add last synchronization status.
- Handle stale data and connection failures.
- Test without requiring Home Assistant to be online continuously.

Deliverable: optional read-only home monitoring integration.

### Milestone 7 — Advanced features
Only after the previous milestones are stable:
- OCR and document extraction
- Assisted document categorization
- Improved contract deadline analysis
- Optional email or push notifications
- Advanced reporting
- Household member accounts
- Optional AI assistant

These are future capabilities, not reasons to delay the first usable release.

## 22. Working protocol for Antigravity

At the beginning of the task:

1. Inspect the current workspace.
2. Summarize what exists and what is missing.
3. Create a prioritized implementation plan.
4. Start Milestone 0 and then Milestone 1.
5. Build the project incrementally.
6. Run the relevant tests.
7. Fix implementation errors.
8. Update the roadmap and documentation.
9. Continue to the next milestone when the current one meets its acceptance criteria.

Do not attempt to implement every advanced feature in one enormous code change.

Do not stop after creating a beautiful dashboard with hardcoded sample data.

Do not replace a working feature with a placeholder.

If a task cannot be completed because credentials, infrastructure details, or approval are missing, finish the safe portions and document exactly what is required to continue.

## 23. Definition of done

The first release is complete only when:

- The application starts successfully.
- Database migrations work.
- Authentication is enforced.
- Unauthorized users cannot access protected data.
- Contract records can be created, edited, searched, and archived.
- Documents can be uploaded and downloaded securely.
- Income and expense records persist correctly.
- Financial totals are accurate.
- Invoices and reminders work.
- The dashboard displays actual database information.
- German and Turkish translations are functional.
- The interface works on desktop and iPhone-sized screens.
- Automated checks and critical tests have been executed.
- Docker deployment instructions are complete.
- Backup and restore instructions are documented.
- No secrets or personal documents are committed to Git.
- Known limitations are explicitly documented.

Begin with workspace inspection and the technical plan. Then implement the first milestone and demonstrate the working result. Prioritize security, correctness, maintainability, and a reliable foundation over unnecessary complexity.
