import type { TodoItem, TodosState } from '../../shared';

export class TodosStore {
  private state: TodosState;

  constructor(workspaceId: string) {
    this.state = { workspaceId, items: [] };
  }

  add(text: string): void {
    const item: TodoItem = { id: crypto.randomUUID(), text, done: false };
    this.state.items.push(item);
  }

  toggle(id: string): void {
    const item = this.state.items.find((t) => t.id === id);
    if (item) item.done = !item.done;
  }

  getState(): TodosState {
    return this.state;
  }
}
