export type RunScriptMode = "concurrent" | "nonconcurrent";

export interface OpenAppJson {
  scripts?: { setup?: string; run?: string; archive?: string };
  runScriptMode?: RunScriptMode;
}
