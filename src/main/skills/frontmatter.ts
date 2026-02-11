export type SkillFrontmatter = {
  name?: string;
  description?: string;
};

/**
 * Parses simple YAML-style frontmatter from a markdown document.
 * Only single-line "key: value" mappings are supported.
 */
export function parseSkillFrontmatter(markdown: string): SkillFrontmatter {
  if (!markdown.startsWith('---\n')) {
    return {};
  }

  const endMarker = markdown.indexOf('\n---', 4);
  if (endMarker < 0) {
    return {};
  }

  const block = markdown.slice(4, endMarker).trim();
  const result: SkillFrontmatter = {};

  for (const line of block.split('\n')) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!value) continue;

    if (key === 'name') {
      result.name = value;
    } else if (key === 'description') {
      result.description = value;
    }
  }

  return result;
}
