import { describe, expect, it } from 'vitest';
import { commandNames, mentionTypes } from '../composer';

describe('composer shared contracts', () => {
  it('exports the full built-in command list for v2', () => {
    expect(commandNames).toEqual(
      expect.arrayContaining([
        'help',
        'clear',
        'model',
        'compact',
        'review',
        'plan',
        'status',
        'diff',
        'test',
        'resume',
        'rewind',
        'rename',
        'export',
        'copy',
        'exit',
        'context',
        'memory',
        'init',
        'add-dir',
        'todos',
        'tasks',
        'debug',
        'config',
        'permissions',
        'cost',
        'theme',
        'vim',
        'usage',
        'stats',
        'doctor',
        'bug',
        'mcp'
      ])
    );
  });

  it('supports file/dir/image/mcp mention types', () => {
    expect(mentionTypes).toEqual(['file', 'directory', 'image', 'mcp']);
  });
});
