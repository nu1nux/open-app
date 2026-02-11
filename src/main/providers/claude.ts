/**
 * @fileoverview Claude provider bridge for composer execution.
 * @module main/providers/claude
 */

import { execa } from 'execa';
import type {
  ClaudeExecutionRequest,
  ComposerExecutionCallbacks,
  ComposerExecutionResult
} from '../../shared/composer';

/**
 * Claude CLI JSON result shape for --output-format json.
 */
type ClaudeCliResult = {
  is_error?: boolean;
  result?: string;
};

/**
 * Creates a provider-unavailable result with a stable diagnostic.
 */
function providerUnavailable(message: string): ComposerExecutionResult {
  return {
    ok: false,
    provider: 'claude-code',
    diagnostics: [
      {
        code: 'PROVIDER_UNAVAILABLE',
        severity: 'error',
        message,
        start: 0,
        end: 0,
        blocking: true
      }
    ],
    action: 'none'
  };
}

/**
 * Creates a provider error result with configurable diagnostic code.
 */
function providerError(
  code: 'PROVIDER_UNAVAILABLE' | 'PROVIDER_AUTH_REQUIRED' | 'CMD_INVALID_ARGS',
  message: string
): ComposerExecutionResult {
  return {
    ok: false,
    provider: 'claude-code',
    diagnostics: [
      {
        code,
        severity: 'error',
        message,
        start: 0,
        end: 0,
        blocking: true
      }
    ],
    action: 'none'
  };
}

/**
 * Builds a Claude CLI prompt from normalized parse output.
 */
function buildPrompt(request: ClaudeExecutionRequest): string {
  const { parseResult } = request;
  const command = parseResult.command;
  const lines: string[] = [];

  if (command) {
    const argsText = command.args.join(' ').trim();
    switch (command.name) {
      case 'compact':
        lines.push('Respond concisely.');
        break;
      case 'review':
        lines.push('Perform a review-style response focused on issues, risks, and missing tests.');
        break;
      case 'plan':
        lines.push('Provide an implementation plan with clear steps.');
        break;
      case 'status':
        lines.push('Summarize the current workspace status.');
        break;
      case 'diff':
        lines.push(argsText ? `Focus on diff analysis for target: ${argsText}.` : 'Focus on relevant git diff analysis.');
        break;
      case 'test':
        lines.push(argsText ? `Focus on testing scope: ${argsText}.` : 'Focus on test strategy and validation.');
        break;
      default:
        break;
    }
  }

  if (parseResult.mentions.length > 0) {
    lines.push(
      `Referenced files:\n${parseResult.mentions.map((mention) => `- ${mention.relativePath ?? mention.display}`).join('\n')}`
    );
  }

  let userPrompt = parseResult.normalizedPrompt;
  if (command) {
    const prefix = `/${command.name}`;
    if (userPrompt.startsWith(prefix)) {
      userPrompt = userPrompt.slice(prefix.length).trim();
    }
  }

  if (userPrompt) {
    lines.push(`User request:\n${userPrompt}`);
  }

  return lines.join('\n\n').trim();
}

/**
 * Executes a prepared request through Claude Code CLI.
 */
export async function executeClaudeRequest(
  request: ClaudeExecutionRequest,
  callbacks?: ComposerExecutionCallbacks
): Promise<ComposerExecutionResult> {
  const prompt = buildPrompt(request);
  if (!prompt) {
    callbacks?.onStreamEnd?.();
    return providerUnavailable('Composer prompt is empty after normalization.');
  }

  const args = ['-p', '--output-format', 'json'];
  if (request.modelOverride) {
    args.push('--model', request.modelOverride);
  }
  args.push(prompt);

  try {
    const result = await execa('claude', args, {
      cwd: request.workspacePath,
      reject: false,
      timeout: 120000
    });

    const raw = result.stdout.trim() || result.stderr.trim();
    if (!raw) {
      callbacks?.onStreamEnd?.();
      return providerUnavailable('Claude Code returned an empty response.');
    }

    let payload: ClaudeCliResult | null = null;
    try {
      payload = JSON.parse(raw) as ClaudeCliResult;
    } catch {
      payload = null;
    }

    if (payload?.is_error) {
      const errorMessage = payload.result ?? 'Claude Code returned an error response.';
      const normalized = errorMessage.toLowerCase();
      if (normalized.includes('invalid_model')) {
        callbacks?.onStreamEnd?.();
        return providerError('CMD_INVALID_ARGS', errorMessage);
      }
      if (normalized.includes('auth') || normalized.includes('token')) {
        callbacks?.onStreamEnd?.();
        return providerError('PROVIDER_AUTH_REQUIRED', errorMessage);
      }
      callbacks?.onStreamEnd?.();
      return providerUnavailable(errorMessage);
    }

    const output = payload?.result ?? raw;
    if (output) {
      callbacks?.onStreamChunk?.(output);
    }
    callbacks?.onStreamEnd?.();

    return {
      ok: true,
      provider: 'claude-code',
      output,
      action: 'none'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Claude Code execution failure.';
    callbacks?.onStreamEnd?.();
    return providerUnavailable(`Failed to execute Claude Code CLI: ${message}`);
  }
}
