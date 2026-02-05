/**
 * @fileoverview Zustand store for Git state management.
 * @module renderer/stores/gitStore
 */

import { create } from 'zustand';
import type { GitFileStatus, GitSummary } from '../types';

/**
 * Git store state and actions.
 */
type GitState = {
  summary: GitSummary | null;
  files: GitFileStatus[];
  isLoading: boolean;
  fetchSummary: () => Promise<void>;
  fetchFiles: () => Promise<void>;
};

/**
 * Zustand store for managing Git state.
 * Provides actions for fetching git summary and file statuses.
 */
export const useGitStore = create<GitState>((set) => ({
  summary: null,
  files: [],
  isLoading: false,

  fetchSummary: async () => {
    set({ isLoading: true });
    const summary = await window.openApp.git.summary();
    set({ summary, isLoading: false });
  },

  fetchFiles: async () => {
    set({ isLoading: true });
    const result = await window.openApp.git.files();
    set({ files: result.files ?? [], isLoading: false });
  }
}));
