/**
 * @fileoverview Shared delete transaction type definitions.
 * @module shared/delete
 */

export type DeleteEntityType = 'thread' | 'workspace';

export type DeleteActionStatus = 'pending' | 'committed' | 'reverted' | 'failed';

export type DeleteErrorCode =
  | 'DELETE_NOT_FOUND'
  | 'DELETE_ALREADY_FINALIZED'
  | 'DELETE_UNDO_EXPIRED'
  | 'DELETE_COMMIT_FAILED'
  | 'DELETE_FEATURE_DISABLED';

export type DeleteSnapshot = {
  entityType: DeleteEntityType;
  payload: Record<string, unknown>;
};

export type DeleteAction = {
  id: string;
  entityType: DeleteEntityType;
  entityId: string;
  status: DeleteActionStatus;
  createdAt: number;
  deadlineAt: number;
  updatedAt: number;
  snapshot: DeleteSnapshot;
  errorCode?: DeleteErrorCode;
  errorMessage?: string;
};

export type DeleteRequest = {
  entityType: DeleteEntityType;
  entityId: string;
  snapshot: DeleteSnapshot;
};

export type DeleteUndoRequest = {
  actionId: string;
};

export type DeleteResult =
  | { ok: true; action: DeleteAction }
  | { ok: false; error: { code: DeleteErrorCode; message: string } };

export const DELETE_UNDO_WINDOW_MS = 5000;
