import { describe, expect, it } from 'vitest';
import { getCommand, listCommands } from '../registry';

describe('composer registry', () => {
  it('registers v2 commands with category and handler', () => {
    const commands = listCommands();
    expect(commands.length).toBeGreaterThanOrEqual(30);

    const compact = getCommand('compact');
    expect(compact?.handler).toBe('cli-proxy');
    expect(compact?.category).toBe('session');

    const help = getCommand('help');
    expect(help?.handler).toBe('local');
  });
});
