# Shrimp shadcn/ui Migration Design

## Goal

Replace every reusable hand-written UI control and direct interactive HTML control in `web/src` with a local shadcn/ui component, preserving Shrimp's current theme, page layout, accessibility names, and tool behavior. Semantic document structure (`article`, `section`, headings, `fieldset`, etc.) remains HTML.

## Component boundary

- Generate local shadcn/ui Button, Input, Textarea, Card, Label, Checkbox, Alert, Accordion, and Sheet components under `web/src/components/ui/`. Keep the existing shadcn Select and adapt generated classes to Shrimp's CSS tokens.
- Retire `web/src/components/ui.tsx` once its consumers import shadcn primitives or focused adapters. A small `Field` helper may remain if it composes shadcn Field/Label and preserves accessible form associations; it must not render its own controls.
- Convert each native select to the shadcn Select compound API. Values and handlers stay equivalent, including GLM/DeepSeek, HTTP method, hash algorithm, timestamp unit, text/list options, radix bases, and Jev question type.
- Convert direct buttons, inputs, checkboxes, and the HTTP details disclosure. Preserve radio semantics for category filters. Native links and semantic containers remain.
- Replace the custom Agent chat overlay with shadcn Sheet, maintaining the global launcher, one transcript, stop/clear behavior, focus management, and mobile full-screen layout.

## Visual and behavior constraints

- Preserve Shrimp's light/dark colors, sizing, spacing, and rounded-card visual language. Generated component styles can be adapted to existing tokens.
- Preserve all existing tool calculations, API calls, local storage keys, and Agent persistence/model behavior.
- Do not migrate server code or use the HTTP proxy as an Agent tool.
- Work in current main checkout and do not commit.

## Verification

- Test component interactions and accessibility names before replacing each area. Run the full Vitest suite, TypeScript, ESLint, Prettier check, and Vite production build.
- Inspect desktop and 375px mobile light/dark screens, including dropdowns, checkboxes, disclosure, and chat overlay.
- Search production TSX for unapproved direct interactive controls and the retired custom UI module. Inspect diff for secrets and unrelated edits.
