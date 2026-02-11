/**
 * @fileoverview Slash command registry for composer command parsing and suggestions.
 * @module main/composer/registry
 */

import type { CommandDefinition } from '../../shared/composer';

/**
 * Canonical v2 slash command definitions.
 */
const commandRegistry: CommandDefinition[] = [
  {
    name: 'help',
    syntax: '/help',
    description: 'Show supported slash commands and usage.',
    category: 'workflow',
    handler: 'local',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'clear',
    syntax: '/clear',
    description: 'Clear the current composer draft context.',
    category: 'session',
    handler: 'local',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'model',
    syntax: '/model <model>',
    description: 'Override the Claude model for subsequent requests.',
    category: 'config',
    handler: 'local',
    minArgs: 1,
    maxArgs: 1,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'compact',
    syntax: '/compact',
    description: 'Compact conversation context.',
    category: 'session',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 8,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'resume',
    syntax: '/resume [session]',
    description: 'Resume a prior session.',
    category: 'session',
    handler: 'session',
    minArgs: 0,
    maxArgs: 1,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'rewind',
    syntax: '/rewind [steps]',
    description: 'Rewind session context.',
    category: 'session',
    handler: 'session',
    minArgs: 0,
    maxArgs: 1,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'rename',
    syntax: '/rename <title>',
    description: 'Rename the active session.',
    category: 'session',
    handler: 'session',
    minArgs: 1,
    maxArgs: 12,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'export',
    syntax: '/export [format]',
    description: 'Export current conversation.',
    category: 'session',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 3,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'copy',
    syntax: '/copy',
    description: 'Copy latest result to clipboard.',
    category: 'session',
    handler: 'local',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'exit',
    syntax: '/exit',
    description: 'Exit the active composer session.',
    category: 'session',
    handler: 'local',
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'context',
    syntax: '/context [target]',
    description: 'Inspect or change context sources.',
    category: 'context',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 6,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'memory',
    syntax: '/memory [action]',
    description: 'Manage memory and instructions.',
    category: 'context',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 6,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'init',
    syntax: '/init',
    description: 'Initialize CLAUDE.md for workspace.',
    category: 'context',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 2,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'add-dir',
    syntax: '/add-dir <path>',
    description: 'Add an extra directory to context.',
    category: 'context',
    handler: 'cli-proxy',
    minArgs: 1,
    maxArgs: 4,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'review',
    syntax: '/review',
    description: 'Switch to review-oriented response behavior.',
    category: 'workflow',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 8,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'plan',
    syntax: '/plan',
    description: 'Switch to planning-oriented response behavior.',
    category: 'workflow',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 8,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'todos',
    syntax: '/todos',
    description: 'Show or update todos.',
    category: 'workflow',
    handler: 'session',
    minArgs: 0,
    maxArgs: 6,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'tasks',
    syntax: '/tasks',
    description: 'Inspect running tasks.',
    category: 'workflow',
    handler: 'session',
    minArgs: 0,
    maxArgs: 4,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'debug',
    syntax: '/debug',
    description: 'Run task debugging helpers.',
    category: 'workflow',
    handler: 'session',
    minArgs: 0,
    maxArgs: 6,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'status',
    syntax: '/status',
    description: 'Request current workspace status behavior.',
    category: 'diagnostics',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 4,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'diff',
    syntax: '/diff [target]',
    description: 'Request diff-focused behavior for optional target path.',
    category: 'workflow',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 6,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'test',
    syntax: '/test [scope]',
    description: 'Request test-focused behavior for optional scope.',
    category: 'workflow',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 6,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'config',
    syntax: '/config [key] [value]',
    description: 'Read or update configuration.',
    category: 'config',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 6,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'permissions',
    syntax: '/permissions [mode]',
    description: 'Inspect or set tool permissions.',
    category: 'config',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 4,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'cost',
    syntax: '/cost',
    description: 'Show usage cost details.',
    category: 'config',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 3,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'theme',
    syntax: '/theme [name]',
    description: 'Set UI theme preferences.',
    category: 'config',
    handler: 'local',
    minArgs: 0,
    maxArgs: 1,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'vim',
    syntax: '/vim [on|off]',
    description: 'Toggle vim editing mode.',
    category: 'config',
    handler: 'local',
    minArgs: 0,
    maxArgs: 1,
    allowFlags: false,
    source: 'builtin'
  },
  {
    name: 'usage',
    syntax: '/usage',
    description: 'Show usage summary.',
    category: 'config',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 2,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'stats',
    syntax: '/stats',
    description: 'Show model and tool stats.',
    category: 'config',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 2,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'doctor',
    syntax: '/doctor',
    description: 'Run CLI diagnostics.',
    category: 'diagnostics',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 2,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'bug',
    syntax: '/bug',
    description: 'Report a bug with diagnostics.',
    category: 'diagnostics',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 4,
    allowFlags: true,
    source: 'builtin'
  },
  {
    name: 'mcp',
    syntax: '/mcp [action]',
    description: 'Inspect MCP server/resource state.',
    category: 'integration',
    handler: 'cli-proxy',
    minArgs: 0,
    maxArgs: 6,
    allowFlags: true,
    source: 'builtin'
  }
];

/**
 * Fast command map by command name.
 */
const commandByName = new Map<string, CommandDefinition>(commandRegistry.map((definition) => [definition.name, definition]));
let customCommandRegistry: CommandDefinition[] = [];
let customCommandByName = new Map<string, CommandDefinition>();

/**
 * Lists all registered commands.
 */
export function listCommands(): CommandDefinition[] {
  return [...commandRegistry, ...customCommandRegistry];
}

/**
 * Gets a command definition by name.
 */
export function getCommand(name: string): CommandDefinition | null {
  return commandByName.get(name) ?? customCommandByName.get(name) ?? null;
}

/**
 * Replaces custom command definitions loaded from skills.
 */
export function setCustomCommands(commands: CommandDefinition[]) {
  customCommandRegistry = commands;
  customCommandByName = new Map<string, CommandDefinition>(commands.map((definition) => [definition.name, definition]));
}
