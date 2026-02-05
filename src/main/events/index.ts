import { EventEmitter } from 'node:events';

export type AppEvent = 'workspace:changed' | 'git:changed' | 'diff:changed';

type Listener = () => void;

const emitter = new EventEmitter();

export function onAppEvent(event: AppEvent, listener: Listener) {
  emitter.on(event, listener);
  return () => emitter.off(event, listener);
}

export function emitAppEvent(event: AppEvent) {
  emitter.emit(event);
}
