# Agent Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, single-thread GLM/DeepSeek Agent chat modal to Shrimp with five safe local tools.

**Architecture:** Browser-only chat orchestration. Fixed-provider streaming Chat Completions adapters normalize SSE and tool calls. IndexedDB stores one transcript; localStorage stores user-supplied keys. A fixed local tool catalog executes validated calls, with regex isolated in a Worker.

**Tech Stack:** React 19, Vite, TypeScript, TanStack Router/Query, Vitest, IndexedDB, Web Workers.

**Spec:** `docs/superpowers/specs/2026-09-30-agent-chat-design.md`

## Global Constraints

- No new Spring Boot chat endpoint; no server code changes.
- Work in current main checkout, preserve unrelated changes, do not commit Git.
- Only GLM and DeepSeek; fixed official endpoints; user-owned browser-stored keys.
- One persistent transcript; no multi-session UI; clear history only after confirmation.
- Expose only JSON, Base64, timestamp, UUID, regex to Agent; no HTTP proxy.
- A live browser+key test is needed before claiming either provider is reachable.

---

### Task 1: Local chat settings and transcript

**Files:** Create `web/src/features/agent/types.ts`, `storage.ts`, `storage.test.ts`.

**Interfaces:** `ProviderId`, `ChatMessage`, `AgentSettings`; `readSettings`, `writeSettings`, `openTranscript`, `appendMessage`, `listMessages`, `clearMessages`.

- [ ] Write failing tests for settings validation, key isolation, ordered transcript append/read and clear that preserves keys.
- [ ] Run `pnpm --dir web test --run src/features/agent/storage.test.ts` and observe expected failure.
- [ ] Implement versioned IndexedDB single-store transcript and guarded localStorage settings. Surface storage failures.
- [ ] Run the targeted test and verify pass.

### Task 2: Fixed local Agent tools

**Files:** Create `web/src/features/agent/tools.ts`, `tools.test.ts`, `regex-worker.ts`, `regex-runner.ts`.

**Interfaces:** `agentToolSchemas`, `executeAgentTool(name, args, signal)`, returning serialized bounded result.

- [ ] Write failing tests for all five tool success paths, malformed/oversized parameters, unknown tool and result bounds.
- [ ] Run targeted tests and observe expected failure.
- [ ] Implement schema-backed runtime validation and reuse `web/src/tools/lib` functions. Execute regex in a terminable Worker with bounded match count.
- [ ] Run targeted tests and verify pass.

### Task 3: Provider stream adapters

**Files:** Create `web/src/features/agent/providers.ts`, `sse.ts`, `providers.test.ts`, `sse.test.ts`.

**Interfaces:** `streamCompletion({provider, model, key, messages, tools, signal, onEvent})`; events `text`, `tool_call`, `done`.

- [ ] Write failing tests for fixed URLs, Authorization placement, key redaction on errors, UTF-8/SSE chunk boundaries, multi-call argument assembly and abort.
- [ ] Run targeted tests and observe expected failure.
- [ ] Implement fetch stream parser and provider mapping without accepting arbitrary URLs.
- [ ] Run targeted tests and verify pass.

### Task 4: Agent turn coordinator

**Files:** Create `web/src/features/agent/agent.ts`, `agent.test.ts`.

**Interfaces:** `runAgentTurn` receives transcript, provider settings, `onUpdate`, `signal`; returns persisted message records.

- [ ] Write failing tests for plain streaming, tool-call follow-up, 3-request/5-tool bounds, errors and stopped partial response.
- [ ] Run targeted tests and observe expected failure.
- [ ] Implement orchestration with at most 20 recent context messages and bounded content. Preserve tool call IDs in provider protocol.
- [ ] Run targeted tests and verify pass.

### Task 5: Modal UI and app integration

**Files:** Create `web/src/features/agent/agent-dialog.tsx`, `agent-dialog.test.tsx`; modify `web/src/components/app-shell.tsx` and relevant styles.

**Interfaces:** Top-bar button opens global dialog; dialog reads/writes settings and transcript, calls `runAgentTurn`.

- [ ] Write failing UI tests for open/close, send disabled without key, provider switch, persistent transcript, stop, confirmed clear and key deletion.
- [ ] Run targeted tests and observe expected failure.
- [ ] Implement accessible dialog/drawer with single transcript and explicit local-key warning.
- [ ] Run targeted tests and verify pass.

### Task 6: Integration and manual provider gate

**Files:** Update `web/README.md` with setup, browser storage and CORS limitations.

- [ ] Run `pnpm --dir web test --run`, `pnpm --dir web typecheck`, `pnpm --dir web lint`, `pnpm --dir web build`, `pnpm --dir web format:check` and fix only Agent-related failures.
- [ ] In a real browser with user-provided keys, test GLM and DeepSeek streaming, one tool call and error states. If keys are unavailable, report live connectivity as unverified.
- [ ] Inspect `git diff` for scope and secrets; do not commit.
