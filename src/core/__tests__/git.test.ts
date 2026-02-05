/**
 * @fileoverview Unit tests for the git adapter module.
 * @module core/__tests__/git.test
 */

import { createGitAdapter } from "../git";

/**
 * Tests that createGitAdapter returns a valid adapter object.
 */
it("createGitAdapter returns adapter", () => {
  const adapter = createGitAdapter();
  expect(typeof adapter.diff).toBe("function");
});
