# CouplesCalendar

CouplesCalendar is a private, mobile-first shared-calendar progressive web application for
exactly two users.

Phase 1 establishes the full planned shared-calendar experience with a deliberately lightweight
React, TypeScript, Vite, Tailwind CSS, FullCalendar, and Supabase stack. External synchronization
with Google Calendar, Apple Calendar, and Outlook Calendar is outside Phase 1 scope.

## Milestone Status

Milestone 0 establishes the repository and workspace foundation only. The current application
screen identifies the project and confirms that the workspace foundation is operational.

Milestone 1 establishes the product, UX, architecture, data, security, and roadmap contracts that
later milestones must implement. It does not implement runtime product features.

No authentication, Supabase backend, database schema or migrations, couple membership, calendar UI,
event workflow, recurrence, notification, PWA installation behavior, external calendar
synchronization, or deployment functionality is implemented yet.

## Milestone 1 Contracts

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Security design](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)

## Prerequisites

- Node.js 22, as declared in `.nvmrc`
- npm 10 or newer

## Local Setup

Install dependencies from the committed lockfile:

```bash
npm ci
```

Start the Vite development server:

```bash
npm run dev
```

Run the full validation gate:

```bash
npm run validate
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Environment Variables

Copy `.env.example` to a local `.env` file when later milestones need browser-safe Supabase
configuration:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not commit real `.env` files or secrets. Supabase project creation and integration belong to
later milestones.

## Repository Structure

```text
src/
  app/         Root application component and app-level tests.
  components/  Small reusable UI components.
  lib/         Purpose-specific shared project metadata.
  styles/      Global stylesheet and Tailwind entry point.
  test/        Test environment setup.
```

Additional root files configure Vite, TypeScript, ESLint, Prettier, npm scripts, environment
templates, GitHub Actions validation, and repository hygiene.
