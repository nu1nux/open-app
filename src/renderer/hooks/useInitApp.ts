/**
 * @fileoverview Application initialization hook.
 * Handles initial data fetching and event subscriptions.
 * @module renderer/hooks/useInitApp
 */

import { useEffect } from 'react';
import { useWorkspaceStore, useGitStore, useThreadStore } from '../stores';

/**
 * Hook that initializes the application state.
 * Fetches initial data and subscribes to IPC events for real-time updates.
 */
export function useInitApp() {
  const { fetchCurrent, fetchList, current } = useWorkspaceStore();
  const { fetchSummary, fetchFiles } = useGitStore();
  const { fetchThreads } = useThreadStore();

  // Initial data fetch
  useEffect(() => {
    fetchCurrent();
    fetchList();
  }, [fetchCurrent, fetchList]);

  // Fetch workspace-specific data when current workspace changes
  useEffect(() => {
    if (current) {
      fetchSummary();
      fetchFiles();
      fetchThreads(current.id);
    }
  }, [current, fetchSummary, fetchFiles, fetchThreads]);

  // Subscribe to IPC events
  useEffect(() => {
    const unsubWorkspace = window.openApp.events.on('workspace:changed', () => {
      fetchCurrent();
      fetchList();
    });

    const unsubGit = window.openApp.events.on('git:changed', () => {
      fetchSummary();
      fetchFiles();
    });

    return () => {
      unsubWorkspace();
      unsubGit();
    };
  }, [fetchCurrent, fetchList, fetchSummary, fetchFiles]);
}
