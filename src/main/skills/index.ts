import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CommandDefinition } from '../../shared/composer';
import { commandNames } from '../../shared/composer';
import { parseSkillFrontmatter } from './frontmatter';

type SkillCandidate = {
  name: string;
  markdownPath: string;
};

const builtinNames = new Set<string>(commandNames);

function normalizeCommandName(rawName: string): string {
  return rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function listDirectoryEntries(rootPath: string) {
  try {
    return await fs.readdir(rootPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function discoverSkillMarkdownFiles(skillsRoot: string): Promise<SkillCandidate[]> {
  const result: SkillCandidate[] = [];
  const entries = await listDirectoryEntries(skillsRoot);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = normalizeCommandName(entry.name);
    if (!name) continue;
    result.push({
      name,
      markdownPath: path.join(skillsRoot, entry.name, 'SKILL.md')
    });
  }

  return result;
}

async function discoverLegacyCommandFiles(commandsRoot: string): Promise<SkillCandidate[]> {
  const result: SkillCandidate[] = [];
  const entries = await listDirectoryEntries(commandsRoot);

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.md')) continue;

    const base = entry.name.slice(0, -3);
    const name = normalizeCommandName(base);
    if (!name) continue;
    result.push({
      name,
      markdownPath: path.join(commandsRoot, entry.name)
    });
  }

  return result;
}

function toCommandDefinition(name: string, description?: string): CommandDefinition {
  return {
    name,
    syntax: `/${name} [args]`,
    description: description ?? `Run custom skill "${name}".`,
    category: 'custom',
    handler: 'custom',
    minArgs: 0,
    maxArgs: 64,
    allowFlags: true,
    source: 'skill'
  };
}

async function parseCommandFromMarkdown(candidate: SkillCandidate): Promise<CommandDefinition | null> {
  let content = '';
  try {
    content = await fs.readFile(candidate.markdownPath, 'utf8');
  } catch {
    return null;
  }

  const metadata = parseSkillFrontmatter(content);
  const name = normalizeCommandName(metadata.name ?? candidate.name);
  if (!name || builtinNames.has(name)) {
    return null;
  }

  return toCommandDefinition(name, metadata.description);
}

/**
 * Discovers custom skill commands from user and workspace locations.
 */
export async function discoverSkillCommands(workspacePath: string): Promise<CommandDefinition[]> {
  const roots = {
    projectSkills: path.join(workspacePath, '.claude', 'skills'),
    userSkills: path.join(os.homedir(), '.claude', 'skills'),
    projectLegacyCommands: path.join(workspacePath, '.claude', 'commands')
  };

  const candidates = [
    ...(await discoverSkillMarkdownFiles(roots.projectSkills)),
    ...(await discoverSkillMarkdownFiles(roots.userSkills)),
    ...(await discoverLegacyCommandFiles(roots.projectLegacyCommands))
  ];

  const byName = new Map<string, CommandDefinition>();
  for (const candidate of candidates) {
    if (byName.has(candidate.name)) continue;
    const definition = await parseCommandFromMarkdown(candidate);
    if (!definition) continue;
    byName.set(definition.name, definition);
  }

  return [...byName.values()];
}
