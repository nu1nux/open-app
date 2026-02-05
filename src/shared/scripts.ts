/**
 * @fileoverview Script configuration type definitions.
 * @module shared/scripts
 */

/**
 * Mode for running scripts - concurrent allows multiple, nonconcurrent kills previous.
 */
export type RunScriptMode = "concurrent" | "nonconcurrent";

/**
 * Configuration schema for open-app.json files.
 */
export interface OpenAppJson {
  scripts?: { setup?: string; run?: string; archive?: string };
  runScriptMode?: RunScriptMode;
}
