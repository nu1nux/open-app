/**
 * @fileoverview Delete transaction coordinator.
 * @module main/delete/coordinator
 */

import { randomUUID } from 'node:crypto';
import {
  DELETE_UNDO_WINDOW_MS,
  type DeleteAction,
  type DeleteRequest,
  type DeleteResult
} from '../../shared/delete';
import { DeleteStore } from './store';

type CommitWorkspaceResult = {
  removed: boolean;
  current: unknown;
};

export type DeleteCoordinatorDeps = {
  commitThread: (id: string) => Promise<boolean>;
  commitWorkspace: (id: string) => Promise<CommitWorkspaceResult>;
  onChanged?: () => void;
  now?: () => number;
  undoWindowMs?: number;
  store?: DeleteStore;
};

/**
 * Coordinates the delete request -> pending -> commit/undo lifecycle.
 */
export class DeleteCoordinator {
  private readonly store: DeleteStore;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly commitThread: (id: string) => Promise<boolean>;
  private readonly commitWorkspace: (id: string) => Promise<CommitWorkspaceResult>;
  private readonly onChanged?: () => void;
  private readonly now: () => number;
  private readonly undoWindowMs: number;

  constructor(deps: DeleteCoordinatorDeps) {
    this.store = deps.store ?? new DeleteStore();
    this.commitThread = deps.commitThread;
    this.commitWorkspace = deps.commitWorkspace;
    this.onChanged = deps.onChanged;
    this.now = deps.now ?? (() => Date.now());
    this.undoWindowMs = deps.undoWindowMs ?? DELETE_UNDO_WINDOW_MS;
  }

  async request(request: DeleteRequest): Promise<DeleteResult> {
    const createdAt = this.now();
    const action: DeleteAction = {
      id: randomUUID(),
      entityType: request.entityType,
      entityId: request.entityId,
      status: 'pending',
      createdAt,
      deadlineAt: createdAt + this.undoWindowMs,
      updatedAt: createdAt,
      snapshot: request.snapshot
    };

    this.store.set(action);
    this.scheduleCommit(action.id, Math.max(0, action.deadlineAt - createdAt));
    this.onChanged?.();
    return { ok: true, action };
  }

  async undo(actionId: string): Promise<DeleteResult> {
    const action = this.store.get(actionId);
    if (!action) {
      return {
        ok: false,
        error: {
          code: 'DELETE_NOT_FOUND',
          message: 'Delete action not found.'
        }
      };
    }

    if (action.status !== 'pending') {
      return {
        ok: false,
        error: {
          code: 'DELETE_ALREADY_FINALIZED',
          message: 'Delete action is no longer pending.'
        }
      };
    }

    if (this.now() > action.deadlineAt) {
      return {
        ok: false,
        error: {
          code: 'DELETE_UNDO_EXPIRED',
          message: 'Undo window has expired.'
        }
      };
    }

    this.clearTimer(actionId);
    const reverted: DeleteAction = {
      ...action,
      status: 'reverted',
      updatedAt: this.now()
    };
    this.store.delete(actionId);
    this.onChanged?.();
    return { ok: true, action: reverted };
  }

  listPending() {
    const pending = this.store.listPending();
    const failed = this.store.consumeFailed();
    return [...pending, ...failed];
  }

  private scheduleCommit(actionId: string, delayMs: number) {
    this.clearTimer(actionId);
    const timer = setTimeout(() => {
      void this.commit(actionId);
    }, delayMs);
    this.timers.set(actionId, timer);
  }

  private clearTimer(actionId: string) {
    const timer = this.timers.get(actionId);
    if (!timer) return;
    clearTimeout(timer);
    this.timers.delete(actionId);
  }

  private async commit(actionId: string) {
    const action = this.store.get(actionId);
    if (!action || action.status !== 'pending') {
      this.clearTimer(actionId);
      return;
    }

    try {
      await this.commitEntity(action);
      this.store.delete(actionId);
    } catch (error) {
      const failed: DeleteAction = {
        ...action,
        status: 'failed',
        updatedAt: this.now(),
        errorCode: 'DELETE_COMMIT_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Delete commit failed.'
      };
      this.store.set(failed);
    } finally {
      this.clearTimer(actionId);
      this.onChanged?.();
    }
  }

  private async commitEntity(action: DeleteAction) {
    if (action.entityType === 'thread') {
      await this.commitThread(action.entityId);
      return;
    }
    await this.commitWorkspace(action.entityId);
  }
}
