/**
 * @fileoverview In-memory delete action storage.
 * @module main/delete/store
 */

import type { DeleteAction } from '../../shared/delete';

/**
 * In-memory delete action storage with helpers for pending/failed action queries.
 */
export class DeleteStore {
  private readonly actions = new Map<string, DeleteAction>();

  get(actionId: string) {
    return this.actions.get(actionId) ?? null;
  }

  set(action: DeleteAction) {
    this.actions.set(action.id, action);
  }

  delete(actionId: string) {
    this.actions.delete(actionId);
  }

  listPending() {
    return [...this.actions.values()]
      .filter((action) => action.status === 'pending')
      .sort((a, b) => a.deadlineAt - b.deadlineAt);
  }

  /**
   * Returns failed actions once, then removes them so renderer can restore UI
   * without replaying the same failure forever.
   */
  consumeFailed() {
    const failed = [...this.actions.values()]
      .filter((action) => action.status === 'failed')
      .sort((a, b) => b.updatedAt - a.updatedAt);
    for (const action of failed) {
      this.actions.delete(action.id);
    }
    return failed;
  }
}
