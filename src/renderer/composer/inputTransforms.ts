type CommandSuggestionInput = {
  name: string;
};

type MentionSuggestionInput = {
  value: string;
};

type ApplyResult = {
  value: string;
  cursor: number;
};

function findCommandRange(rawInput: string): { start: number; end: number } {
  const match = rawInput.match(/^\s*\/[^\s]*/);
  if (!match || match.index === undefined) {
    return { start: 0, end: 0 };
  }
  return {
    start: match.index,
    end: match.index + match[0].length
  };
}

function findMentionRange(rawInput: string, cursor: number): { start: number; end: number } | null {
  const prefix = rawInput.slice(0, cursor);
  const match = prefix.match(/(?:^|\s)@([A-Za-z0-9_./:-]*)$/);
  if (!match || match.index === undefined) return null;
  const localAt = match[0].lastIndexOf('@');
  if (localAt < 0) return null;
  const start = match.index + localAt;
  return { start, end: cursor };
}

export function applyCommandSuggestion(
  rawInput: string,
  suggestion: CommandSuggestionInput,
  _cursor: number
): ApplyResult {
  const range = findCommandRange(rawInput);
  const trailing = rawInput.slice(range.end).trimStart();
  const insert = `/${suggestion.name}`;
  const value = `${rawInput.slice(0, range.start)}${insert}${trailing ? ` ${trailing}` : ' '}`;
  return {
    value,
    cursor: range.start + insert.length + 1
  };
}

export function applyMentionSuggestion(
  rawInput: string,
  suggestion: MentionSuggestionInput,
  cursor: number
): ApplyResult {
  const range = findMentionRange(rawInput, cursor);
  if (!range) {
    return { value: rawInput, cursor };
  }

  const insert = `@${suggestion.value}`;
  const value = `${rawInput.slice(0, range.start)}${insert}${rawInput.slice(range.end)}`;
  return {
    value,
    cursor: range.start + insert.length
  };
}
