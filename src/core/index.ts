/**
 * @fileoverview Core module exports for the application.
 * Re-exports all core business logic including git, storage, workspaces,
 * scripts, diff, todos, spotlight, and checkpoints modules.
 * @module core
 */

export * from "./git";
export * from "./storage/workspace-repo";
export * from "./workspaces/service";
export * from "./scripts/runner";
export * from "./diff/service";
export * from "./todos/store";
export * from "./spotlight/spotlight";
export * from "./checkpoints/checkpoints";
