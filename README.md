# CouplesCalendar

CouplesCalendar is a private, mobile-first shared-calendar progressive web application for
exactly two users.

Phase 1 establishes the full planned shared-calendar experience with a deliberately lightweight
React, TypeScript, Vite, Tailwind CSS, FullCalendar, and Supabase stack. External synchronization
with Google Calendar, Apple Calendar, and Outlook Calendar is outside Phase 1 scope.

## Milestone Status

Milestone 0 is complete and owner-approved.

Milestone 1 is complete and owner-approved. It established the product, UX, architecture, data,
security, and roadmap contracts that later milestones must implement.

Milestone 2 is complete and owner-approved. It establishes the responsive application shell,
mobile-first design tokens, accessible placeholder navigation, reusable UI primitives,
representative states, and automated shell/component tests.

Milestone 3 is implemented and awaiting owner review. It adds Supabase Auth integration, guarded
session startup, sign-up/sign-in/sign-out/password-reset surfaces, user-owned profile setup and
editing, and the RLS-protected `profiles` migration.

No couple membership, invitations, calendar data, event workflow, recurrence, notification, PWA
installation behavior, external calendar synchronization, or deployment functionality is implemented
yet.

## Milestone 1 Contracts

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Security design](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Milestone 2 acceptance notes](docs/MILESTONE_2_ACCEPTANCE.md)

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

Copy `.env.example` to a local `.env` file and provide browser-safe Supabase configuration:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not commit real `.env` files or secrets. Supabase project creation and integration belong to
later milestones.

## Repository Structure

```text
src/
  app/          Root application shell, navigation metadata, and app-level tests.
  components/   Layout and UI primitives.
  icons/        Minimal internal SVG icons.
  lib/          Purpose-specific shared utilities and project metadata.
  styles/       Global stylesheet, Tailwind entry point, and design tokens.
  test/         Test environment setup.
```

Additional root files configure Vite, TypeScript, ESLint, Prettier, npm scripts, environment
templates, GitHub Actions validation, and repository hygiene.
