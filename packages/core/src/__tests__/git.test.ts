import { createGitAdapter } from "../git";

it("createGitAdapter returns adapter", () => {
  const adapter = createGitAdapter();
  expect(typeof adapter.diff).toBe("function");
});
