/**
 * @fileoverview Unit tests for the todos module.
 * @module shared/__tests__/todos.test
 */

import { canMerge } from "../todos";

/**
 * Tests that canMerge returns true when all todo items are completed.
 */
it("canMerge returns true when all todos are done", () => {
  const result = canMerge({ workspaceId: "w1", items: [{ id: "1", text: "a", done: true }] });
  expect(result).toBe(true);
});
