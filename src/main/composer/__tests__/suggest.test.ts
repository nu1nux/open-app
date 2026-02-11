import { describe, expect, it } from 'vitest';
import { suggestComposer } from '../index';

describe('suggestComposer command suggestions', () => {
  it('returns all slash commands when input is only "/"', async () => {
    const result = await suggestComposer({
      rawInput: '/',
      cursor: 1,
      workspaceId: 'workspace-1',
      threadId: null
    });

    expect(result.context).toBe('command');
    expect(result.query).toBe('');
    expect(result.suggestions.length).toBeGreaterThanOrEqual(30);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'command', name: 'help' }),
        expect.objectContaining({ kind: 'command', name: 'mcp' })
      ])
    );
  });

  it('keeps command suggestion context for underscore command names', async () => {
    const result = await suggestComposer({
      rawInput: '/my_custom',
      cursor: '/my_custom'.length,
      workspaceId: 'workspace-1',
      threadId: null
    });

    expect(result.context).toBe('command');
    expect(result.query).toBe('my_custom');
  });
});
