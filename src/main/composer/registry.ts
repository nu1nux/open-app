/**
 * @fileoverview Slash command registry for composer command parsing and suggestions.
 * @module main/composer/registry
 */

import type { CommandDefinition, CommandName } from '../../shared/composer';

/**
 * Canonical v1 slash command definitions.
 */
const commandRegistry: CommandDefinition[] = [
  {
    name: 'help',
    syntax: '/help',
    description: 'Show supported slash commands and usage.',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: 'clear',
    syntax: '/clear',
    description: 'Clear the current composer draft context.',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: 'model',
    syntax: '/model <model>',
    description: 'Override the Claude model for subsequent requests.',
    minArgs: 1,
    maxArgs: 1,
    allowFlags: false
  },
  {
    name: 'compact',
    syntax: '/compact',
    description: 'Request concise output style.',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: 'review',
    syntax: '/review',
    description: 'Switch to review-oriented response behavior.',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: 'plan',
    syntax: '/plan',
    description: 'Switch to planning-oriented response behavior.',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: 'status',
    syntax: '/status',
    description: 'Request current workspace status behavior.',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: 'diff',
    syntax: '/diff [target]',
    description: 'Request diff-focused behavior for optional target path.',
    minArgs: 0,
    maxArgs: 1,
    allowFlags: false
  },
  {
    name: 'test',
    syntax: '/test [scope]',
    description: 'Request test-focused behavior for optional scope.',
    minArgs: 0,
    maxArgs: 1,
    allowFlags: false
  }
];

/**
 * Fast command map by command name.
 */
const commandByName = new Map<CommandName, CommandDefinition>(
  commandRegistry.map((definition) => [definition.name, definition])
);

/**
 * Lists all registered commands.
 */
export function listCommands(): CommandDefinition[] {
  return commandRegistry;
}

/**
 * Gets a command definition by name.
 */
export function getCommand(name: string): CommandDefinition | null {
  return commandByName.get(name as CommandName) ?? null;
}
