# CouplesCalendar Milestone 2 Acceptance

## Milestone Objective

Milestone 2 implements the responsive application shell and mobile-first design-system foundation
for later CouplesCalendar milestones. The work is presentation and interaction infrastructure only.

## Component Inventory

- App shell with semantic header, main region, phone bottom navigation, desktop sidebar navigation,
  and desktop context panel.
- Placeholder destination state for Calendar, Search, Add event, Categories, and Settings without a
  routing dependency.
- Reusable buttons with primary, secondary, ghost, destructive, icon-only, disabled, and loading
  states.
- Reusable text input, textarea, and native select field primitives with labels, hints, required
  indication, errors, and ARIA associations.
- Reusable dialog and sheet primitives based on browser dialog behavior where available.
- Reusable status banners for information, success, warning, and error states.
- Reusable loading indicator, skeleton stack, and empty state.
- Minimal internal SVG icons for shell and status affordances.

## Source Boundaries

- `src/app/` owns the root shell and placeholder navigation metadata.
- `src/components/layout/` owns shell layout primitives.
- `src/components/ui/` owns reusable UI primitives with no feature data fetching.
- `src/icons/` owns small internal SVG icons.
- `src/lib/` owns shared metadata and tiny general utilities.
- `src/styles/global.css` owns Tailwind entry, CSS custom properties, global tokens, and component
  styling.

Shared UI components do not import feature modules or Supabase code. No router, backend, framework,
state-management library, form library, or new runtime dependency was introduced.

## Design-Token Conventions

Tokens are centralized as CSS custom properties in `src/styles/global.css` and used consistently for
page background, surfaces, text, borders, primary action, status tones, focus ring, radii, shadows,
motion, spacing, touch target size, and safe-area insets.

Tailwind remains the styling pipeline through the existing Vite plugin. Components use the internal
tokenized class system plus lightweight Tailwind utilities where useful.

## Phone Shell Behavior

- The phone layout renders a semantic header, scrollable main region, and fixed bottom navigation.
- Bottom navigation includes Calendar, Search, Add event, and Settings.
- The Add event target is reachable and accessible, but it opens only placeholder content.
- Bottom spacing accounts for the navigation and `env(safe-area-inset-bottom)`.
- Navigation targets meet the 44 by 44 CSS pixel touch target requirement.
- Active navigation uses `aria-current="page"` and a visible non-color marker.

## MacBook Shell Behavior

- At desktop width, the shell uses a persistent left sidebar and removes the phone bottom
  navigation from layout.
- Desktop navigation represents Calendar, Search and filters, Categories, and Settings, with a
  separate Add event placeholder action.
- At wider desktop widths, a persistent context panel appears beside the primary content.
- Main content is constrained and uses deliberate gutters rather than stretching phone content.

## Accessibility Checks

- Semantic `header`, `nav`, `main`, and `aside` landmarks are present with distinct labels.
- Navigation and controls are keyboard-accessible native buttons.
- Active navigation exposes `aria-current`.
- Icon-only buttons require accessible labels in use.
- Fields expose labels, hints, errors, `aria-describedby`, and `aria-invalid`.
- Dialog and sheet expose accessible names and descriptions, explicit close actions, Escape
  dismissal, and focus restoration.
- Status banners use `status` or `alert` semantics by tone and include text plus icons.
- Loading states expose readable status text.
- Focus-visible styling is explicit and not suppressed.
- Motion has a `prefers-reduced-motion` fallback.

## Automated Test Coverage

Vitest and Testing Library cover:

- Application shell rendering.
- Primary landmarks and navigation labels.
- Placeholder navigation behavior.
- Active navigation semantics.
- Desktop category navigation.
- Button variants, disabled behavior, loading behavior, and icon-only behavior.
- Field label, hint, required, and error associations.
- Dialog naming, closing, Escape behavior, and focus return.
- Sheet naming, closing, and Escape behavior.
- Status-banner semantics.
- Loading, skeleton, and empty-state rendering.
- Representative keyboard interaction through focus and Escape dismissal.

## Manual Viewport Checklist

Manual review should cover:

- Small phone around `320 x 568`.
- Modern phone around `390 x 844`.
- Tablet or intermediate width.
- MacBook around `1440 x 900`.

For each viewport, verify:

- No horizontal overflow.
- Bottom navigation does not cover content.
- Safe-area spacing is present.
- Touch targets remain usable.
- Form controls do not collapse improperly.
- Dialogs and sheets fit the viewport.
- Desktop sidebar, main panel, and context panel use space intentionally.
- Keyboard focus remains visible.
- Text remains readable without clipping.
- Reduced-width desktop behavior transitions coherently.

## Explicit Exclusions

Milestone 2 does not implement authentication, Supabase integration, database schema or migrations,
couple workflows, real calendar data, event forms, search logic, filters, settings workflows,
Realtime, PWA service workers, notifications, or deployment.

## Known Limitations

- Placeholder destinations are shell state only and do not persist across reloads.
- Dialog and sheet use browser dialog behavior where supported and a non-persistent open-attribute
  fallback for tests and unsupported environments.
- Responsive validation is local viewport validation, not physical-device validation.

## Evidence Required For Owner Review

- `npm run validate` passes.
- Manual viewport notes are recorded for the required viewport sizes.
- The owner can review the shell locally with `npm run dev`.
- Milestone 2 remains awaiting owner review and is not marked owner-approved.
