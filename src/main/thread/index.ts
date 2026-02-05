/**
 * @fileoverview Thread management module for the main process.
 * Provides functionality for creating, listing, renaming, and removing threads.
 * Stores thread state in a JSON file in the user data directory.
 * @module main/thread
 */

import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Thread } from '../../shared/thread';

/**
 * Internal store structure for thread management.
 */
type ThreadStore = {
  threads: Thread[];
};

/** Current thread store held in memory */
let store: ThreadStore = { threads: [] };

/**
 * Gets the file path for storing thread state.
 * @returns Path to threads.json in user data directory
 */
function getStorePath() {
  return path.join(app.getPath('userData'), 'threads.json');
}

/**
 * Loads thread state from the persistent storage file.
 * Initializes empty state if the file doesn't exist or is invalid.
 */
async function loadStore() {
  try {
    const data = await fs.readFile(getStorePath(), 'utf-8');
    store = JSON.parse(data) as ThreadStore;
  } catch {
    store = { threads: [] };
  }
}

/**
 * Saves the current thread state to the persistent storage file.
 */
async function saveStore() {
  await fs.writeFile(getStorePath(), JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Initializes the thread module by loading saved state.
 */
export async function initThread() {
  await loadStore();
}

/**
 * Lists all threads for a specific workspace.
 * @param workspaceId - The workspace ID to filter threads by
 * @returns Array of threads sorted by updatedAt descending
 */
export async function listThreads(workspaceId: string): Promise<Thread[]> {
  return store.threads
    .filter((t) => t.workspaceId === workspaceId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Creates a new thread in the specified workspace.
 * @param workspaceId - The workspace ID to create the thread in
 * @param title - The title of the new thread
 * @returns The newly created thread
 */
export async function createThread(workspaceId: string, title: string): Promise<Thread> {
  const now = Date.now();
  const thread: Thread = {
    id: randomUUID(),
    workspaceId,
    title,
    createdAt: now,
    updatedAt: now
  };
  store.threads.push(thread);
  await saveStore();
  return thread;
}

/**
 * Renames an existing thread.
 * @param id - The thread ID to rename
 * @param title - The new title for the thread
 * @returns The updated thread or null if not found
 */
export async function renameThread(id: string, title: string): Promise<Thread | null> {
  const thread = store.threads.find((t) => t.id === id);
  if (!thread) return null;
  thread.title = title;
  thread.updatedAt = Date.now();
  await saveStore();
  return thread;
}

/**
 * Removes a thread by ID.
 * @param id - The thread ID to remove
 * @returns True if the thread was removed, false if not found
 */
export async function removeThread(id: string): Promise<boolean> {
  const index = store.threads.findIndex((t) => t.id === id);
  if (index === -1) return false;
  store.threads.splice(index, 1);
  await saveStore();
  return true;
}
