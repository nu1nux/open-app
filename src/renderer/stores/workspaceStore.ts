/**
 * @fileoverview Zustand store for workspace state management.
 * @module renderer/stores/workspaceStore
 */

import { create } from 'zustand';
import type { WorkspaceEntry } from '../types';

/**
 * Workspace store state and actions.
 */
type WorkspaceState = {
  current: WorkspaceEntry | null;
  list: WorkspaceEntry[];
  isLoading: boolean;
  fetchCurrent: () => Promise<void>;
  fetchList: () => Promise<void>;
  setCurrent: (id: string) => Promise<void>;
  pick: () => Promise<void>;
  removeWorkspaceLocal: (id: string) => WorkspaceEntry | null;
  restoreWorkspaceLocal: (
    workspace: WorkspaceEntry,
    options?: { index?: number; currentId?: string | null }
  ) => void;
};

/**
 * Zustand store for managing workspace state.
 * Provides actions for fetching, setting, and picking workspaces.
 */
export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  current: null,
  list: [],
  isLoading: false,

  fetchCurrent: async () => {
    set({ isLoading: true });
    const current = await window.openApp.workspace.current();
    set({ current, isLoading: false });
  },

  fetchList: async () => {
    set({ isLoading: true });
    const list = await window.openApp.workspace.list();
    set({ list, isLoading: false });
  },

  setCurrent: async (id: string) => {
    set({ isLoading: true });
    const current = await window.openApp.workspace.set(id);
    set({ current, isLoading: false });
  },

  pick: async () => {
    set({ isLoading: true });
    const current = await window.openApp.workspace.pick();
    if (current) {
      set({ current });
    }
    set({ isLoading: false });
  },

  removeWorkspaceLocal: (id: string) => {
    let removed: WorkspaceEntry | null = null;
    set((state) => {
      removed = state.list.find((workspace) => workspace.id === id) ?? null;
      const nextList = state.list.filter((workspace) => workspace.id !== id);
      const nextCurrent =
        state.current?.id === id
          ? nextList[0] ?? null
          : state.current && nextList.some((workspace) => workspace.id === state.current?.id)
            ? state.current
            : nextList[0] ?? null;
      return {
        list: nextList,
        current: nextCurrent
      };
    });
    return removed;
  },

  restoreWorkspaceLocal: (
    workspace: WorkspaceEntry,
    options?: { index?: number; currentId?: string | null }
  ) => {
    set((state) => {
      const nextList = [...state.list];
      const existingIndex = nextList.findIndex((entry) => entry.id === workspace.id);
      if (existingIndex >= 0) {
        nextList[existingIndex] = workspace;
      } else {
        const insertAt = options?.index ?? 0;
        const boundedIndex = Math.min(Math.max(insertAt, 0), nextList.length);
        nextList.splice(boundedIndex, 0, workspace);
      }

      const nextCurrent =
        options?.currentId === workspace.id
          ? workspace
          : state.current && nextList.some((entry) => entry.id === state.current?.id)
            ? state.current
            : nextList[0] ?? null;

      return {
        list: nextList,
        current: nextCurrent
      };
    });
  }
}));
