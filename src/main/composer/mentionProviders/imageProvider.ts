import path from 'node:path';
import type { MentionRef, MentionSuggestion } from '../../../shared/composer';
import type { MentionProvider, MentionProviderInput } from './types';
import { fileMentionProvider } from './fileProvider';

const imageExtensionPattern = /\.(png|jpe?g|gif|svg|webp)$/i;

function isImagePath(relativePath: string): boolean {
  return imageExtensionPattern.test(relativePath);
}

function normalizeImageSuggestion(workspaceId: string, suggestion: MentionSuggestion): MentionSuggestion {
  return {
    ...suggestion,
    id: `${workspaceId}:image:${suggestion.relativePath}`
  };
}

async function suggest(input: MentionProviderInput): Promise<MentionSuggestion[]> {
  const fileSuggestions = await fileMentionProvider.suggest(input);
  return fileSuggestions
    .filter((entry) => isImagePath(entry.relativePath))
    .map((entry) => normalizeImageSuggestion(input.workspaceId, entry));
}

async function resolve(input: MentionProviderInput): Promise<MentionRef | null> {
  const direct = await fileMentionProvider.resolve(input);
  if (direct && direct.relativePath && isImagePath(direct.relativePath)) {
    return {
      ...direct,
      id: `${input.workspaceId}:image:${direct.relativePath}`,
      type: 'image'
    };
  }

  const normalized = input.query.replace(/^\.?\//, '');
  if (!isImagePath(normalized)) return null;

  const suggestions = await suggest(input);
  const best =
    suggestions.find((entry) => entry.relativePath.toLowerCase() === normalized.toLowerCase()) ?? suggestions[0];
  if (!best) return null;

  return {
    id: best.id,
    type: 'image',
    workspaceId: input.workspaceId,
    absolutePath: path.resolve(input.workspacePath, normalized),
    relativePath: best.relativePath,
    display: best.display
  };
}

export const imageMentionProvider: MentionProvider = {
  kind: 'image',
  suggest,
  resolve
};
