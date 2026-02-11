import { describe, expect, it } from 'vitest';
import { applyCommandSuggestion, applyMentionSuggestion } from '../inputTransforms';

describe('composer input transforms', () => {
  it('adds trailing space after slash command insertion', () => {
    const result = applyCommandSuggestion('/co', { name: 'compact' }, 3);
    expect(result.value).toBe('/compact ');
  });

  it('replaces only the active mention token', () => {
    const result = applyMentionSuggestion('check @sr', { value: 'src/main/index.ts' }, 9);
    expect(result.value).toBe('check @src/main/index.ts');
  });
});
