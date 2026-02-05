# AGENTS.md

This file provides guidance to Code Agent when working with code in this repository.

## Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Start dev server + Electron (opens DevTools)
pnpm build          # Bundle main, preload, and renderer
pnpm typecheck      # Run TypeScript checks for all three processes
pnpm test           # Run unit tests with Vitest
pnpm dist           # Build and package distributable
```

## Architecture

This is an Electron desktop app using the standard three-process architecture:

**Main Process** (`src/main/`) — Node.js with full OS access
- `index.ts`: App entry, window creation, module initialization
- `ipc/`: IPC handler registration for workspace, git, and diff operations
- `workspace/`: Workspace state management (stores in `~/.config/open-app/workspaces.json`)
- `git/`: Git integration via `execFile` (status, diff, summary)
- `watchers/`: File system watchers using chokidar (debounced 250ms)
- `events/`: EventEmitter-based app bus broadcasting `workspace:changed`, `git:changed`, `diff:changed`

**Preload Script** (`src/preload/`) — Context bridge exposing safe APIs to renderer
- Validates IPC channels (only `workspace:*`, `git:*`, `diff:*` allowed)
- Exposes `window.openApp` API with typed methods

**Renderer Process** (`src/renderer/`) — React UI in isolated context
- Communicates with main process exclusively via IPC
- Uses Tailwind CSS for styling

**Shared Code**
- `src/core/`: Business logic used by main process (git adapter, services, better-sqlite3 database)
- `src/shared/`: TypeScript type definitions shared across processes

## Data Flow

```
Renderer → IPC invoke() → Main Process Handler
                              ↓
                         Modifies state/filesystem
                              ↓
                         EventEmitter broadcast()
                              ↓
Renderer Event Listener ← IPC send()
```

## Code Style

- 2-space indentation, semicolons, single quotes
- PascalCase for React components and types, camelCase for functions/variables
- Commit messages: imperative subjects with optional scope (e.g., `renderer: add diff viewer`)
