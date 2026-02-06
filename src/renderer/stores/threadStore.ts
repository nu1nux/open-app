/**
 * @fileoverview Zustand store for thread state management.
 * @module renderer/stores/threadStore
 */

import { create } from 'zustand';
import type { Thread } from '../types';

/**
 * Thread store state and actions.
 */
type ThreadState = {
  threads: Thread[];
  activeId: string | null;
  isLoading: boolean;
  fetchThreads: (workspaceId: string) => Promise<void>;
  createThread: (workspaceId: string, title: string) => Promise<void>;
  removeThread: (id: string) => Promise<void>;
  removeThreadLocal: (id: string) => Thread | null;
  restoreThreadLocal: (thread: Thread, options?: { index?: number; activeId?: string | null }) => void;
  setActive: (id: string | null) => void;
};

/**
 * Zustand store for managing thread state.
 * Provides actions for fetching, creating, removing threads and setting active thread.
 */
export const useThreadStore = create<ThreadState>((set, get) => ({
  threads: [],
  activeId: null,
  isLoading: false,

  fetchThreads: async (workspaceId: string) => {
    set({ isLoading: true });
    const threads = await window.openApp.thread.list(workspaceId);
    set({ threads, isLoading: false });
  },

  createThread: async (workspaceId: string, title: string) => {
    const thread = await window.openApp.thread.create(workspaceId, title);
    set((state) => ({
      threads: [thread, ...state.threads],
      activeId: thread.id
    }));
  },

  removeThread: async (id: string) => {
    await window.openApp.thread.remove(id);
    get().removeThreadLocal(id);
  },

  removeThreadLocal: (id: string) => {
    let removed: Thread | null = null;
    set((state) => {
      removed = state.threads.find((thread) => thread.id === id) ?? null;
      return {
        threads: state.threads.filter((thread) => thread.id !== id),
        activeId: state.activeId === id ? null : state.activeId
      };
    });
    return removed;
  },

  restoreThreadLocal: (thread: Thread, options?: { index?: number; activeId?: string | null }) => {
    set((state) => ({
      threads: (() => {
        const existingIndex = state.threads.findIndex((current) => current.id === thread.id);
        if (existingIndex >= 0) {
          const next = [...state.threads];
          next[existingIndex] = thread;
          return next;
        }
        const next = [...state.threads];
        const insertAt = options?.index ?? 0;
        const boundedIndex = Math.min(Math.max(insertAt, 0), next.length);
        next.splice(boundedIndex, 0, thread);
        return next;
      })(),
      activeId: options?.activeId ?? state.activeId
    }));
  },

  setActive: (id: string | null) => {
    set({ activeId: id });
  }
}));
