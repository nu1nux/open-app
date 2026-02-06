import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeleteAction, Thread, WorkspaceEntry } from '../types';
import { useDeleteStore } from './deleteStore';
import { useThreadStore } from './threadStore';
import { useWorkspaceStore } from './workspaceStore';

type MockOpenApp = {
  delete: {
    request: ReturnType<typeof vi.fn>;
    undo: ReturnType<typeof vi.fn>;
    listPending: ReturnType<typeof vi.fn>;
  };
  thread: {
    remove: ReturnType<typeof vi.fn>;
  };
  workspace: {
    remove: ReturnType<typeof vi.fn>;
  };
};

function installWindowMock(mockOpenApp: MockOpenApp) {
  Object.defineProperty(globalThis, 'window', {
    value: { openApp: mockOpenApp },
    configurable: true,
    writable: true
  });
}

function createThread(overrides?: Partial<Thread>): Thread {
  return {
    id: overrides?.id ?? 'thread-1',
    workspaceId: overrides?.workspaceId ?? 'workspace-1',
    title: overrides?.title ?? 'Thread 1',
    createdAt: overrides?.createdAt ?? 1,
    updatedAt: overrides?.updatedAt ?? 1
  };
}

function createWorkspace(overrides?: Partial<WorkspaceEntry>): WorkspaceEntry {
  return {
    id: overrides?.id ?? 'workspace-1',
    name: overrides?.name ?? 'Workspace',
    path: overrides?.path ?? '/tmp/workspace',
    lastOpenedAt: overrides?.lastOpenedAt ?? new Date(0).toISOString()
  };
}

function createPendingThreadAction(thread: Thread): DeleteAction {
  return {
    id: 'action-1',
    entityType: 'thread',
    entityId: thread.id,
    status: 'pending',
    createdAt: 1,
    deadlineAt: 5_001,
    updatedAt: 1,
    snapshot: {
      entityType: 'thread',
      payload: {
        thread,
        index: 0,
        previousActiveId: thread.id
      }
    }
  };
}

beforeEach(() => {
  useDeleteStore.setState({ pending: [] });
  useThreadStore.setState({ threads: [], activeId: null, isLoading: false });
  useWorkspaceStore.setState({ current: null, list: [], isLoading: false });
});

describe('useDeleteStore', () => {
  it('optimistically removes thread and tracks pending delete action', async () => {
    const thread = createThread();
    useThreadStore.setState({ threads: [thread], activeId: thread.id, isLoading: false });

    const pendingAction = createPendingThreadAction(thread);
    const openApp: MockOpenApp = {
      delete: {
        request: vi.fn().mockResolvedValue({ ok: true, action: pendingAction }),
        undo: vi.fn(),
        listPending: vi.fn().mockResolvedValue([])
      },
      thread: {
        remove: vi.fn().mockResolvedValue(true)
      },
      workspace: {
        remove: vi.fn().mockResolvedValue({ removed: true, current: null })
      }
    };
    installWindowMock(openApp);

    await useDeleteStore.getState().requestThreadDelete(thread);

    expect(useThreadStore.getState().threads).toHaveLength(0);
    expect(useDeleteStore.getState().pending).toEqual([pendingAction]);
    expect(openApp.delete.request).toHaveBeenCalledTimes(1);
  });

  it('restores thread snapshot after successful undo', async () => {
    const thread = createThread();
    useThreadStore.setState({ threads: [thread], activeId: thread.id, isLoading: false });
    const pendingAction = createPendingThreadAction(thread);

    const openApp: MockOpenApp = {
      delete: {
        request: vi.fn().mockResolvedValue({ ok: true, action: pendingAction }),
        undo: vi.fn().mockResolvedValue({
          ok: true,
          action: { ...pendingAction, status: 'reverted', updatedAt: 2 }
        }),
        listPending: vi.fn().mockResolvedValue([])
      },
      thread: {
        remove: vi.fn().mockResolvedValue(true)
      },
      workspace: {
        remove: vi.fn().mockResolvedValue({ removed: true, current: null })
      }
    };
    installWindowMock(openApp);

    await useDeleteStore.getState().requestThreadDelete(thread);
    await useDeleteStore.getState().undoDelete(pendingAction.id);

    expect(useThreadStore.getState().threads.map((entry) => entry.id)).toEqual([thread.id]);
    expect(useThreadStore.getState().activeId).toBe(thread.id);
    expect(useDeleteStore.getState().pending).toEqual([]);
    expect(openApp.delete.undo).toHaveBeenCalledWith({ actionId: pendingAction.id });
  });

  it('falls back to direct remove API when delete transactions are disabled', async () => {
    const thread = createThread();
    const workspace = createWorkspace();
    useThreadStore.setState({ threads: [thread], activeId: thread.id, isLoading: false });
    useWorkspaceStore.setState({ current: workspace, list: [workspace], isLoading: false });

    const openApp: MockOpenApp = {
      delete: {
        request: vi.fn().mockResolvedValue({
          ok: false,
          error: { code: 'DELETE_FEATURE_DISABLED', message: 'disabled' }
        }),
        undo: vi.fn(),
        listPending: vi.fn().mockResolvedValue([])
      },
      thread: {
        remove: vi.fn().mockResolvedValue(true)
      },
      workspace: {
        remove: vi.fn().mockResolvedValue({ removed: true, current: null })
      }
    };
    installWindowMock(openApp);

    await useDeleteStore.getState().requestThreadDelete(thread);

    expect(openApp.thread.remove).toHaveBeenCalledWith(thread.id);
    expect(useThreadStore.getState().threads).toHaveLength(0);
    expect(useDeleteStore.getState().pending).toEqual([]);
  });
});
