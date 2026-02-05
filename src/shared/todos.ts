/**
 * @fileoverview Todo type definitions and utilities.
 * @module shared/todos
 */

/**
 * Represents a single todo item.
 */
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

/**
 * State container for todos in a workspace.
 */
export interface TodosState {
  workspaceId: string;
  items: TodoItem[];
}

/**
 * Checks if all todos are completed, allowing merge.
 * @param {TodosState} todos - The todos state to check
 * @returns {boolean} True if all todos are done
 */
export function canMerge(todos: TodosState): boolean {
  return todos.items.every((t) => t.done);
}
