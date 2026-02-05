import { canMerge } from "../todos";

it("canMerge returns true when all todos are done", () => {
  const result = canMerge({ workspaceId: "w1", items: [{ id: "1", text: "a", done: true }] });
  expect(result).toBe(true);
});
