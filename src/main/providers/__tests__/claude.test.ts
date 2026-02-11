import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execaMock } = vi.hoisted(() => ({
  execaMock: vi.fn()
}));

vi.mock('execa', () => ({
  execa: execaMock
}));

import type { ClaudeExecutionRequest } from '../../../shared/composer';
import { executeClaudeRequest } from '../claude';

function createRequest(): ClaudeExecutionRequest {
  return {
    workspaceId: 'workspace-1',
    workspacePath: process.cwd(),
    threadId: null,
    parseResult: {
      rawInput: '/compact',
      tokens: [],
      command: {
        name: 'compact',
        args: [],
        raw: '/compact',
        start: 0,
        end: 8
      },
      mentions: [],
      normalizedPrompt: '/compact',
      diagnostics: [],
      blocking: false
    }
  };
}

describe('executeClaudeRequest', () => {
  beforeEach(() => {
    execaMock.mockReset();
  });

  it('forwards output through onStreamChunk callback', async () => {
    execaMock.mockResolvedValue({
      stdout: JSON.stringify({ result: 'streamed output' }),
      stderr: '',
      exitCode: 0
    });

    const chunks: string[] = [];
    const result = await executeClaudeRequest(createRequest(), {
      onStreamChunk: (chunk) => chunks.push(chunk)
    });

    expect(result.ok).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('streamed output');
  });
});
