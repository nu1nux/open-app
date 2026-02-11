import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { discoverSkillCommands } from '../index';

async function writeFile(root: string, relativePath: string, content: string) {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, 'utf8');
}

describe('discoverSkillCommands', () => {
  const workspaces: string[] = [];

  afterEach(async () => {
    await Promise.all(
      workspaces.map(async (workspacePath) => {
        await fs.rm(workspacePath, { recursive: true, force: true });
      })
    );
    workspaces.length = 0;
  });

  it('loads project skills from .claude/skills/*/SKILL.md', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-skills-'));
    workspaces.push(workspacePath);

    await writeFile(
      workspacePath,
      '.claude/skills/my-skill/SKILL.md',
      `---\nname: my-skill\ndescription: Runs my project skill\n---\n\n# My Skill\n`
    );

    const commands = await discoverSkillCommands(workspacePath);
    expect(commands.some((command) => command.name === 'my-skill')).toBe(true);
  });

  it('loads legacy .claude/commands/*.md entries', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-skills-'));
    workspaces.push(workspacePath);

    await writeFile(workspacePath, '.claude/commands/legacy-command.md', '# Legacy command\n');

    const commands = await discoverSkillCommands(workspacePath);
    expect(commands.some((command) => command.name === 'legacy-command')).toBe(true);
    expect(commands.some((command) => command.source === 'skill')).toBe(true);
  });
});
