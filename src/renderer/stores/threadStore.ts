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
  setActive: (id: string | null) => void;
};

/**
 * Zustand store for managing thread state.
 * Provides actions for fetching, creating, removing threads and setting active thread.
 */
export const useThreadStore = create<ThreadState>((set) => ({
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
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== id),
      activeId: state.activeId === id ? null : state.activeId
    }));
  },

  setActive: (id: string | null) => {
    set({ activeId: id });
  }
}));
