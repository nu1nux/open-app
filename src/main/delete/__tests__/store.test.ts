import { describe, expect, it } from 'vitest';
import type { DeleteAction } from '../../../shared/delete';
import { DeleteStore } from '../store';

function createAction(overrides?: Partial<DeleteAction>): DeleteAction {
  const now = Date.now();
  return {
    id: overrides?.id ?? 'action-1',
    entityType: overrides?.entityType ?? 'thread',
    entityId: overrides?.entityId ?? 'thread-1',
    status: overrides?.status ?? 'pending',
    createdAt: overrides?.createdAt ?? now,
    deadlineAt: overrides?.deadlineAt ?? now + 5000,
    updatedAt: overrides?.updatedAt ?? now,
    snapshot: overrides?.snapshot ?? { entityType: 'thread', payload: { id: 'thread-1' } },
    errorCode: overrides?.errorCode,
    errorMessage: overrides?.errorMessage
  };
}

describe('DeleteStore', () => {
  it('tracks pending actions and excludes finalized actions from listPending', () => {
    const store = new DeleteStore();
    const pending = createAction({ id: 'pending-1', status: 'pending' });
    store.set(pending);

    expect(store.listPending()).toHaveLength(1);

    const committed = createAction({
      ...pending,
      status: 'committed',
      updatedAt: pending.updatedAt + 1
    });
    store.set(committed);

    expect(store.listPending()).toHaveLength(0);
  });

  it('returns failed actions once via consumeFailed', () => {
    const store = new DeleteStore();
    const failed = createAction({
      id: 'failed-1',
      status: 'failed',
      errorCode: 'DELETE_COMMIT_FAILED',
      errorMessage: 'write failed'
    });
    store.set(failed);

    expect(store.consumeFailed()).toEqual([failed]);
    expect(store.consumeFailed()).toEqual([]);
  });
});
