/**
 * @fileoverview Zustand store for delete transaction UI state and orchestration.
 * @module renderer/stores/deleteStore
 */

import { create } from 'zustand';
import type { DeleteAction, DeleteRequest, Thread, WorkspaceEntry } from '../types';
import { useThreadStore } from './threadStore';
import { useWorkspaceStore } from './workspaceStore';

type ThreadSnapshotPayload = {
  thread: Thread;
  index: number;
  previousActiveId: string | null;
};

type WorkspaceSnapshotPayload = {
  workspace: WorkspaceEntry;
  index: number;
  previousCurrentId: string | null;
};

type DeleteState = {
  pending: DeleteAction[];
  requestThreadDelete: (thread: Thread) => Promise<void>;
  requestWorkspaceDelete: (workspace: WorkspaceEntry) => Promise<void>;
  undoDelete: (actionId: string) => Promise<void>;
  fetchPending: () => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isThread(value: unknown): value is Thread {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.workspaceId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}

function isWorkspaceEntry(value: unknown): value is WorkspaceEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.path === 'string' &&
    typeof value.lastOpenedAt === 'string'
  );
}

function asThreadSnapshotPayload(payload: Record<string, unknown>): ThreadSnapshotPayload | null {
  if (!isThread(payload.thread)) return null;
  if (typeof payload.index !== 'number') return null;
  if (typeof payload.previousActiveId !== 'string' && payload.previousActiveId !== null) return null;
  return {
    thread: payload.thread,
    index: payload.index,
    previousActiveId: payload.previousActiveId
  };
}

function asWorkspaceSnapshotPayload(payload: Record<string, unknown>): WorkspaceSnapshotPayload | null {
  if (!isWorkspaceEntry(payload.workspace)) return null;
  if (typeof payload.index !== 'number') return null;
  if (typeof payload.previousCurrentId !== 'string' && payload.previousCurrentId !== null) return null;
  return {
    workspace: payload.workspace,
    index: payload.index,
    previousCurrentId: payload.previousCurrentId
  };
}

function sortPending(actions: DeleteAction[]) {
  return [...actions].sort((a, b) => a.deadlineAt - b.deadlineAt);
}

function buildThreadDeleteRequest(thread: Thread): DeleteRequest {
  const threadState = useThreadStore.getState();
  const index = threadState.threads.findIndex((entry) => entry.id === thread.id);
  return {
    entityType: 'thread',
    entityId: thread.id,
    snapshot: {
      entityType: 'thread',
      payload: {
        thread,
        index: index < 0 ? 0 : index,
        previousActiveId: threadState.activeId
      }
    }
  };
}

function buildWorkspaceDeleteRequest(workspace: WorkspaceEntry): DeleteRequest {
  const workspaceState = useWorkspaceStore.getState();
  const index = workspaceState.list.findIndex((entry) => entry.id === workspace.id);
  return {
    entityType: 'workspace',
    entityId: workspace.id,
    snapshot: {
      entityType: 'workspace',
      payload: {
        workspace,
        index: index < 0 ? 0 : index,
        previousCurrentId: workspaceState.current?.id ?? null
      }
    }
  };
}

function applyOptimisticRemoval(action: DeleteAction) {
  if (action.entityType === 'thread') {
    useThreadStore.getState().removeThreadLocal(action.entityId);
    return;
  }
  useWorkspaceStore.getState().removeWorkspaceLocal(action.entityId);
}

function restoreFromSnapshot(action: DeleteAction) {
  if (!isRecord(action.snapshot.payload)) return;
  if (action.entityType === 'thread') {
    const payload = asThreadSnapshotPayload(action.snapshot.payload);
    if (!payload) return;
    useThreadStore.getState().restoreThreadLocal(payload.thread, {
      index: payload.index,
      activeId: payload.previousActiveId
    });
    return;
  }
  const payload = asWorkspaceSnapshotPayload(action.snapshot.payload);
  if (!payload) return;
  useWorkspaceStore.getState().restoreWorkspaceLocal(payload.workspace, {
    index: payload.index,
    currentId: payload.previousCurrentId
  });
}

export const useDeleteStore = create<DeleteState>((set, get) => ({
  pending: [],

  requestThreadDelete: async (thread: Thread) => {
    const request = buildThreadDeleteRequest(thread);
    const threadState = useThreadStore.getState();
    const removed = threadState.removeThreadLocal(thread.id);
    if (!removed) return;

    try {
      const result = await window.openApp.delete.request(request);
      if (!result.ok) {
        if (result.error.code === 'DELETE_FEATURE_DISABLED') {
          try {
            await window.openApp.thread.remove(thread.id);
            return;
          } catch {
            restoreFromSnapshot({
              id: 'local-restore',
              entityType: 'thread',
              entityId: thread.id,
              status: 'failed',
              createdAt: Date.now(),
              deadlineAt: Date.now(),
              updatedAt: Date.now(),
              snapshot: request.snapshot
            });
            return;
          }
        }
        restoreFromSnapshot({
          id: 'local-restore',
          entityType: 'thread',
          entityId: thread.id,
          status: 'failed',
          createdAt: Date.now(),
          deadlineAt: Date.now(),
          updatedAt: Date.now(),
          snapshot: request.snapshot
        });
        return;
      }

      set((state) => ({
        pending: sortPending([
          ...state.pending.filter((action) => action.id !== result.action.id),
          result.action
        ])
      }));
    } catch {
      restoreFromSnapshot({
        id: 'local-restore',
        entityType: 'thread',
        entityId: thread.id,
        status: 'failed',
        createdAt: Date.now(),
        deadlineAt: Date.now(),
        updatedAt: Date.now(),
        snapshot: request.snapshot
      });
    }
  },

  requestWorkspaceDelete: async (workspace: WorkspaceEntry) => {
    const request = buildWorkspaceDeleteRequest(workspace);
    const workspaceState = useWorkspaceStore.getState();
    const removed = workspaceState.removeWorkspaceLocal(workspace.id);
    if (!removed) return;

    try {
      const result = await window.openApp.delete.request(request);
      if (!result.ok) {
        if (result.error.code === 'DELETE_FEATURE_DISABLED') {
          try {
            const fallbackResult = await window.openApp.workspace.remove(workspace.id);
            if (!fallbackResult.removed) {
              restoreFromSnapshot({
                id: 'local-restore',
                entityType: 'workspace',
                entityId: workspace.id,
                status: 'failed',
                createdAt: Date.now(),
                deadlineAt: Date.now(),
                updatedAt: Date.now(),
                snapshot: request.snapshot
              });
            }
            return;
          } catch {
            restoreFromSnapshot({
              id: 'local-restore',
              entityType: 'workspace',
              entityId: workspace.id,
              status: 'failed',
              createdAt: Date.now(),
              deadlineAt: Date.now(),
              updatedAt: Date.now(),
              snapshot: request.snapshot
            });
            return;
          }
        }
        restoreFromSnapshot({
          id: 'local-restore',
          entityType: 'workspace',
          entityId: workspace.id,
          status: 'failed',
          createdAt: Date.now(),
          deadlineAt: Date.now(),
          updatedAt: Date.now(),
          snapshot: request.snapshot
        });
        return;
      }

      set((state) => ({
        pending: sortPending([
          ...state.pending.filter((action) => action.id !== result.action.id),
          result.action
        ])
      }));
    } catch {
      restoreFromSnapshot({
        id: 'local-restore',
        entityType: 'workspace',
        entityId: workspace.id,
        status: 'failed',
        createdAt: Date.now(),
        deadlineAt: Date.now(),
        updatedAt: Date.now(),
        snapshot: request.snapshot
      });
    }
  },

  undoDelete: async (actionId: string) => {
    const action = get().pending.find((entry) => entry.id === actionId) ?? null;
    if (!action) return;

    try {
      const result = await window.openApp.delete.undo({ actionId });
      if (!result.ok) {
        await get().fetchPending();
        return;
      }

      if (result.action.status === 'reverted') {
        restoreFromSnapshot(result.action);
      }

      set((state) => ({
        pending: state.pending.filter((entry) => entry.id !== actionId)
      }));
    } catch {
      await get().fetchPending();
    }
  },

  fetchPending: async () => {
    try {
      const actions = await window.openApp.delete.listPending();
      for (const action of actions) {
        if (action.status === 'pending') {
          applyOptimisticRemoval(action);
          continue;
        }
        if (action.status === 'failed') {
          restoreFromSnapshot(action);
        }
      }
      set({
        pending: sortPending(actions.filter((action) => action.status === 'pending'))
      });
    } catch {
      set({ pending: [] });
    }
  }
}));
