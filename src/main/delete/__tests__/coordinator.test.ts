import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteCoordinator } from '../coordinator';

describe('DeleteCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('commits pending action when undo deadline expires', async () => {
    const commitThread = vi.fn().mockResolvedValue(true);
    const commitWorkspace = vi.fn().mockResolvedValue({ removed: true, current: null });
    const coordinator = new DeleteCoordinator({ commitThread, commitWorkspace, undoWindowMs: 5000 });

    const result = await coordinator.request({
      entityType: 'thread',
      entityId: 'thread-1',
      snapshot: { entityType: 'thread', payload: { id: 'thread-1', title: 'A' } }
    });

    expect(result.ok).toBe(true);
    expect(coordinator.listPending()).toHaveLength(1);

    vi.advanceTimersByTime(5001);
    await vi.runAllTimersAsync();

    expect(commitThread).toHaveBeenCalledWith('thread-1');
    expect(coordinator.listPending()).toHaveLength(0);
  });

  it('reverts pending action when undo happens before deadline', async () => {
    const commitThread = vi.fn().mockResolvedValue(true);
    const commitWorkspace = vi.fn().mockResolvedValue({ removed: true, current: null });
    const coordinator = new DeleteCoordinator({ commitThread, commitWorkspace, undoWindowMs: 5000 });

    const result = await coordinator.request({
      entityType: 'thread',
      entityId: 'thread-2',
      snapshot: { entityType: 'thread', payload: { id: 'thread-2', title: 'B' } }
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected successful request.');

    const undo = await coordinator.undo(result.action.id);
    expect(undo.ok).toBe(true);
    if (!undo.ok) throw new Error('Expected successful undo.');
    expect(undo.action.status).toBe('reverted');

    vi.advanceTimersByTime(5001);
    await vi.runAllTimersAsync();

    expect(commitThread).not.toHaveBeenCalled();
    expect(coordinator.listPending()).toHaveLength(0);
  });

  it('returns undo expired when action deadline already passed', async () => {
    let now = 1_000;
    const commitThread = vi.fn().mockResolvedValue(true);
    const commitWorkspace = vi.fn().mockResolvedValue({ removed: true, current: null });
    const coordinator = new DeleteCoordinator({
      commitThread,
      commitWorkspace,
      undoWindowMs: 5000,
      now: () => now
    });

    const result = await coordinator.request({
      entityType: 'thread',
      entityId: 'thread-3',
      snapshot: { entityType: 'thread', payload: { id: 'thread-3' } }
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected successful request.');

    now = 7_000;
    const undo = await coordinator.undo(result.action.id);
    expect(undo.ok).toBe(false);
    if (undo.ok) throw new Error('Expected undo failure.');
    expect(undo.error.code).toBe('DELETE_UNDO_EXPIRED');
  });

  it('surfaces failed commits through listPending once', async () => {
    const commitThread = vi.fn().mockRejectedValue(new Error('write failed'));
    const commitWorkspace = vi.fn().mockResolvedValue({ removed: true, current: null });
    const coordinator = new DeleteCoordinator({ commitThread, commitWorkspace, undoWindowMs: 5000 });

    const result = await coordinator.request({
      entityType: 'thread',
      entityId: 'thread-4',
      snapshot: { entityType: 'thread', payload: { id: 'thread-4' } }
    });
    expect(result.ok).toBe(true);

    vi.advanceTimersByTime(5001);
    await vi.runAllTimersAsync();

    const firstRead = coordinator.listPending();
    expect(firstRead).toHaveLength(1);
    expect(firstRead[0].status).toBe('failed');
    expect(firstRead[0].errorCode).toBe('DELETE_COMMIT_FAILED');
    expect(coordinator.listPending()).toHaveLength(0);
  });
});
