/**
 * @fileoverview Application initialization hook.
 * Handles initial data fetching and event subscriptions.
 * @module renderer/hooks/useInitApp
 */

import { useEffect } from 'react';
import { useWorkspaceStore, useGitStore, useThreadStore, useDeleteStore } from '../stores';

/**
 * Hook that initializes the application state.
 * Fetches initial data and subscribes to IPC events for real-time updates.
 */
export function useInitApp() {
  const { fetchCurrent, fetchList, current } = useWorkspaceStore();
  const { fetchSummary, fetchFileLists } = useGitStore();
  const { fetchThreads } = useThreadStore();
  const { fetchPending } = useDeleteStore();

  // Initial data fetch
  useEffect(() => {
    void (async () => {
      await Promise.all([fetchCurrent(), fetchList()]);
      await fetchPending();
    })();
  }, [fetchCurrent, fetchList, fetchPending]);

  // Fetch workspace-specific data when current workspace changes
  useEffect(() => {
    if (!current) return;
    void (async () => {
      await Promise.all([fetchSummary(), fetchFileLists(), fetchThreads(current.id)]);
      await fetchPending();
    })();
  }, [current, fetchSummary, fetchFileLists, fetchThreads, fetchPending]);

  // Subscribe to IPC events
  useEffect(() => {
    const unsubWorkspace = window.openApp.events.on('workspace:changed', async () => {
      await Promise.all([fetchCurrent(), fetchList()]);
      await fetchPending();
    });

    const unsubGit = window.openApp.events.on('git:changed', () => {
      void fetchSummary();
      void fetchFileLists();
    });

    const unsubDelete = window.openApp.events.on('delete:changed', () => {
      fetchPending();
    });

    return () => {
      unsubWorkspace();
      unsubGit();
      unsubDelete();
    };
  }, [fetchCurrent, fetchList, fetchSummary, fetchFileLists, fetchPending]);
}
