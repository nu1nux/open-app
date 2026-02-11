import type { MentionRef, MentionSuggestion, MentionType } from '../../../shared/composer';

export type MentionProviderInput = {
  workspaceId: string;
  workspacePath: string;
  query: string;
  mentionType?: MentionType;
};

export interface MentionProvider {
  kind: MentionType;
  suggest(input: MentionProviderInput): Promise<MentionSuggestion[]>;
  resolve(input: MentionProviderInput): Promise<MentionRef | null>;
}
