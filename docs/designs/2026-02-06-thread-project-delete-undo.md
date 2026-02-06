# Thread and Project Delete with Undo

**Date:** 2026-02-06

## Context
The brainstorming started from a request to support deleting both threads and projects in the app. The codebase already had backend remove capabilities (`thread:remove`, `workspace:remove`), but lacked complete UI flows, safety wording, and a robust undo strategy. The key product constraint defined early was that project deletion must only remove the project from Open App, not delete files from disk. Another explicit requirement was a short undo window for thread deletion.

## Discussion
The discussion narrowed scope through step-by-step choices:
- Project deletion behavior: remove from Open App only (no filesystem deletion).
- Thread deletion behavior: support short undo (5 seconds), not permanent immediate delete.
- Architecture direction: choose a transaction/event-driven model over simpler UI-only or main-only approaches.

Three approaches were compared:
- Frontend soft-delete queue (fast but weaker durability).
- Main-process undo manager (stable but less extensible).
- Event-bus transaction flow (highest upfront complexity, best long-term extensibility).

The selected option was the third approach to unify thread and project deletion under one lifecycle and enable future extensions like batch operations and audit/history.

## Approach
Adopt a transactional delete pipeline with explicit action states and undo deadlines:
- Create a `pending` delete action on request.
- Apply optimistic UI removal immediately.
- Allow undo until deadline (5 seconds), transitioning to `reverted`.
- If undo window expires, commit actual delete and transition to `committed`.
- On errors, transition to `failed` and restore UI appropriately.

This keeps UX responsive while preserving deterministic backend state transitions and consistent behavior across entity types.

## Architecture
- Shared model:
  - `DeleteAction` with `entityType ('thread'|'workspace')`, `entityId`, timestamps, `deadlineAt`, `status`, and restore `snapshot`.
  - Status lifecycle: `pending -> committed | reverted | failed`.
- Main process:
  - `DeleteCoordinator` orchestrates request, timer, commit, and undo.
  - `DeleteStore` tracks pending actions and supports reconstruction via query.
  - Commit routing:
    - `thread` uses existing thread remove flow.
    - `workspace` uses existing workspace remove flow only (no disk delete side effects).
- IPC contract:
  - `delete:request`
  - `delete:undo`
  - `delete:listPending`
  - Event: `delete:changed`
  - Stable machine-readable error codes for renderer branching.
- Renderer:
  - Deletion entry points for threads and projects.
  - Optimistic removal + undo toast with countdown.
  - Restore on undo or failed commit.
  - Rehydrate pending actions on reload via `delete:listPending`.
- Rollout/testing:
  - PR sequence A-E (core, IPC, thread UX, project UX, tests/flag).
  - Feature flag `delete_transactions_v1`.
  - Coverage for coordinator state transitions, IPC shape, UI undo behavior, and safety guard that project removal never deletes on-disk files.
