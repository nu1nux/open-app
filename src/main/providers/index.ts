/**
 * @fileoverview Provider orchestration for composer execution.
 * @module main/providers
 */

import type { ClaudeExecutionRequest, ComposerExecutionResult } from '../../shared/composer';
import { executeClaudeRequest } from './claude';

/**
 * Initializes provider integrations.
 */
export function initProviders() {
  // Reserved for future provider bootstrapping.
}

/**
 * Executes a prepared composer request against local/provider handlers.
 */
export async function executeComposerRequest(
  request: ClaudeExecutionRequest
): Promise<ComposerExecutionResult> {
  const command = request.parseResult.command;

  if (command?.name === 'help') {
    return {
      ok: true,
      provider: 'local',
      output:
        '/help, /clear, /model <model>, /compact, /review, /plan, /status, /diff [target], /test [scope]',
      action: 'none'
    };
  }

  if (command?.name === 'clear') {
    return {
      ok: true,
      provider: 'local',
      output: '',
      action: 'clear'
    };
  }

  if (command?.name === 'model') {
    return {
      ok: true,
      provider: 'local',
      output: `Model override set to ${command.args[0]}.`,
      modelOverride: command.args[0],
      action: 'none'
    };
  }

  return executeClaudeRequest(request);
}
