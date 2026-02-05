export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodosState {
  workspaceId: string;
  items: TodoItem[];
}

export function canMerge(todos: TodosState): boolean {
  return todos.items.every((t) => t.done);
}
