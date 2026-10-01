# shadcn/ui Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Shrimp's web UI controls to shadcn/ui without changing feature behavior or the established visual theme.

**Architecture:** Generate local shadcn primitives, adapt them to existing CSS tokens, then migrate consumers by interaction type. Selects and modal/disclosure controls require compound component API changes; simple controls can keep compatible props.

**Tech Stack:** React 19, Vite, Tailwind CSS 4, shadcn/ui Radix primitives, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-shadcn-migration-design.md`

## Global Constraints

- Keep all tools, routes, state, local storage, and API behavior unchanged.
- Preserve Shrimp's light/dark theme and mobile layout.
- Work on current main; do not commit or overwrite unrelated changes.
- Retain native semantic document tags, but not hand-written reusable UI controls.

---

### Task 1: Local primitives and theme

**Files:** `web/src/components/ui/{button,input,textarea,card,label,checkbox,alert,accordion,sheet,select}.tsx`, `web/src/styles.css`, `web/package.json`, `web/pnpm-lock.yaml`, `web/src/test/setup.ts`.

- [ ] Record current component behavior and add focused tests for variant styling, checkbox state, and alert role.
- [ ] Run targeted tests and observe failures before implementation.
- [ ] Generate missing components with `pnpm dlx shadcn@latest add ... -y`; adapt only classes/tokens required by Shrimp theme.
- [ ] Run targeted tests and typecheck.

### Task 2: Shared control consumers

**Files:** `web/src/components/ui.tsx`, all `web/src/tools/components/*.tsx`, `web/src/features/jev/jev-tool.tsx`, tests beside consumers.

- [ ] Add tests for representative controls (form input, button, card, error alert), then verify red.
- [ ] Replace hand-written Button/Input/Textarea/Card/ErrorBox with shadcn primitives or thin composition adapters that render them.
- [ ] Replace Field labels with shadcn Label/Field while maintaining accessible names.
- [ ] Run tool and Jev tests.

### Task 3: Select migration

**Files:** `web/src/tools/components/{developer-tool-panels,text-tool-panels,tool-panels}.tsx`, `web/src/features/jev/jev-tool.tsx`, tests.

- [ ] Add interaction tests for each select family and verify red against old native selects.
- [ ] Move all native Select users to shadcn SelectTrigger, SelectValue, SelectContent, and SelectItem; preserve values and state transitions.
- [ ] Run targeted tests and typecheck.

### Task 4: Direct controls and disclosure

**Files:** `web/src/components/{app-shell,tool-card}.tsx`, `web/src/routes/index.tsx`, `web/src/features/agent/*.tsx`, `web/src/tools/components/{weekly-report-tool,second-batch-tool-panels,text-tool-panels,tool-panels}.tsx`.

- [ ] Add tests for favorites, theme toggle, category filter, checkbox controls, and HTTP disclosure; verify red where behavior changes.
- [ ] Replace direct buttons/inputs/checkboxes with shadcn components and `<details>` with Accordion. Preserve radio semantics and labels.
- [ ] Run targeted tests and typecheck.

### Task 5: Agent overlay

**Files:** `web/src/features/agent/{agent-dialog,agent-launcher}.tsx` and tests.

- [ ] Add tests for Sheet open/close, Escape/focus, mobile shell and persistent transcript; verify red.
- [ ] Replace manual overlay and portal with shadcn Sheet, preserving model Select and all chat behaviors.
- [ ] Run Agent tests and inspect desktop/mobile.

### Task 6: Final audit

**Files:** `web/README.md` if component setup description changes.

- [ ] Run full `pnpm test --run`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm build` in `web`.
- [ ] Inspect 375px and desktop light/dark layouts with real browser interactions.
- [ ] Search production TSX for remaining direct interactive elements and old `components/ui.tsx` imports; explain any justified native semantics.
- [ ] Run `git diff --check`, inspect scope and secret leakage, and do not commit.
