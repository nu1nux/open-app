/**
 * @fileoverview Provider orchestration for composer execution.
 * @module main/providers
 */

import type {
  ClaudeExecutionRequest,
  ComposerExecutionCallbacks,
  ComposerExecutionResult
} from '../../shared/composer';
import { getCommand } from '../composer/registry';
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
function executeLocalCommand(request: ClaudeExecutionRequest): ComposerExecutionResult | null {
  const command = request.parseResult.command;

  if (command?.name === 'help') {
    return {
      ok: true,
      provider: 'local',
      output:
        listLocalHelp(),
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

  if (command?.name === 'theme' || command?.name === 'vim' || command?.name === 'copy' || command?.name === 'exit') {
    return {
      ok: true,
      provider: 'local',
      output: `Handled local command "/${command.name}".`,
      action: 'none'
    };
  }

  return null;
}

function listLocalHelp(): string {
  return ['/help', '/clear', '/model <model>', '/copy', '/theme [name]', '/vim [on|off]', '/exit'].join(', ');
}

export async function executeComposerRequest(
  request: ClaudeExecutionRequest,
  callbacks?: ComposerExecutionCallbacks
): Promise<ComposerExecutionResult> {
  const command = request.parseResult.command;
  const definition = command ? getCommand(command.name) : null;
  const localResult = executeLocalCommand(request);
  if (localResult) {
    callbacks?.onStreamEnd?.();
    return localResult;
  }

  if (definition?.handler === 'custom') {
    return executeClaudeRequest(request, callbacks);
  }

  if (definition?.handler === 'session' || definition?.handler === 'cli-proxy') {
    return executeClaudeRequest(request, callbacks);
  }

  if (definition?.handler === 'local') {
    callbacks?.onStreamEnd?.();
    return (
      localResult ?? {
        ok: true,
        provider: 'local',
        output: `Handled local command "/${command?.name ?? 'unknown'}".`,
        action: 'none'
      }
    );
  }

  return executeClaudeRequest(request, callbacks);
}
