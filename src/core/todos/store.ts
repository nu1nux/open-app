/**
 * @fileoverview In-memory store for managing todo items.
 * Provides add, toggle, and state retrieval operations.
 * @module core/todos/store
 */

import type { TodoItem, TodosState } from '../../shared';

/**
 * Store class for managing todo items in a workspace.
 */
export class TodosStore {
  /** Internal state holding the todos */
  private state: TodosState;

  /**
   * Creates a new TodosStore instance.
   * @param {string} workspaceId - ID of the workspace this store belongs to
   */
  constructor(workspaceId: string) {
    this.state = { workspaceId, items: [] };
  }

  /**
   * Adds a new todo item to the store.
   * @param {string} text - The text content of the todo
   */
  add(text: string): void {
    const item: TodoItem = { id: crypto.randomUUID(), text, done: false };
    this.state.items.push(item);
  }

  /**
   * Toggles the done status of a todo item.
   * @param {string} id - The ID of the todo to toggle
   */
  toggle(id: string): void {
    const item = this.state.items.find((t) => t.id === id);
    if (item) item.done = !item.done;
  }

  /**
   * Gets the current state of the todos store.
   * @returns {TodosState} The current todos state
   */
  getState(): TodosState {
    return this.state;
  }
}
