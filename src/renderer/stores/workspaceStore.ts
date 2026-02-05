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
  }
}));
