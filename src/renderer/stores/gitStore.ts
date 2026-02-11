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
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
  gitAvailable: boolean;
  gitReason?: string;
  isLoading: boolean;
  fetchSummary: () => Promise<void>;
  fetchFiles: () => Promise<void>;
  fetchFileLists: () => Promise<void>;
};

/**
 * Zustand store for managing Git state.
 * Provides actions for fetching git summary and file statuses.
 */
export const useGitStore = create<GitState>((set) => ({
  summary: null,
  files: [],
  stagedFiles: [],
  unstagedFiles: [],
  gitAvailable: true,
  gitReason: undefined,
  isLoading: false,

  fetchSummary: async () => {
    set({ isLoading: true });
    const summary = await window.openApp.git.summary();
    set({ summary, isLoading: false });
  },

  fetchFiles: async () => {
    set({ isLoading: true });
    const result = await window.openApp.git.files();
    const files = result.files ?? [];
    if (!result.available) {
      set({
        files: [],
        stagedFiles: [],
        unstagedFiles: [],
        gitAvailable: false,
        gitReason: result.reason,
        isLoading: false
      });
      return;
    }

    set({
      files,
      stagedFiles: files.filter((file) => file.staged),
      unstagedFiles: files.filter((file) => file.unstaged),
      gitAvailable: true,
      gitReason: undefined,
      isLoading: false
    });
  },

  fetchFileLists: async () => {
    set({ isLoading: true });
    try {
      const result = await window.openApp.git.fileLists();
      if (!result.available) {
        set({
          files: [],
          stagedFiles: [],
          unstagedFiles: [],
          gitAvailable: false,
          gitReason: result.reason,
          isLoading: false
        });
        return;
      }

      const stagedFiles = result.staged ?? [];
      const unstagedFiles = result.unstaged ?? [];
      const allByKey = new Map<string, GitFileStatus>();
      for (const file of [...stagedFiles, ...unstagedFiles]) {
        allByKey.set(`${file.path}\0${file.status}`, file);
      }
      set({
        stagedFiles,
        unstagedFiles,
        files: Array.from(allByKey.values()),
        gitAvailable: true,
        gitReason: undefined,
        isLoading: false
      });
    } catch {
      const fallback = await window.openApp.git.files();
      if (!fallback.available) {
        set({
          files: [],
          stagedFiles: [],
          unstagedFiles: [],
          gitAvailable: false,
          gitReason: fallback.reason,
          isLoading: false
        });
        return;
      }

      const files = fallback.files ?? [];
      set({
        files,
        stagedFiles: files.filter((file) => file.staged),
        unstagedFiles: files.filter((file) => file.unstaged),
        gitAvailable: true,
        gitReason: undefined,
        isLoading: false
      });
    }
  }
}));
