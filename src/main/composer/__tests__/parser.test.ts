import { describe, expect, it } from 'vitest';
import { parseComposerInput } from '../parser';

describe('parseComposerInput mentions', () => {
  it('extracts directory mentions ending in slash', () => {
    const draft = parseComposerInput('summarize @src/components/');
    expect(draft.mentionQueries[0]).toMatchObject({ query: 'src/components/' });
  });

  it('extracts mcp mentions in @server:resource form', () => {
    const draft = parseComposerInput('inspect @docs:openapi/users');
    expect(draft.mentionQueries[0]).toMatchObject({ query: 'docs:openapi/users' });
  });

  it('does not parse email addresses as mentions', () => {
    const draft = parseComposerInput('email me at a@b.com');
    expect(draft.mentionQueries).toHaveLength(0);
  });
});
