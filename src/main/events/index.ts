/**
 * @fileoverview Application event bus for internal event communication.
 * Provides a centralized event emitter for broadcasting app state changes.
 * @module main/events
 */

import { EventEmitter } from 'node:events';

/**
 * Application event types that can be emitted and listened to.
 */
export type AppEvent = 'workspace:changed' | 'git:changed' | 'diff:changed';

/**
 * Event listener callback function type.
 */
type Listener = () => void;

/** Internal event emitter instance */
const emitter = new EventEmitter();

/**
 * Registers a listener for an application event.
 * @param {AppEvent} event - The event type to listen for
 * @param {Listener} listener - Callback function to invoke when event fires
 * @returns {() => void} Unsubscribe function to remove the listener
 */
export function onAppEvent(event: AppEvent, listener: Listener) {
  emitter.on(event, listener);
  return () => emitter.off(event, listener);
}

/**
 * Emits an application event to all registered listeners.
 * @param {AppEvent} event - The event type to emit
 */
export function emitAppEvent(event: AppEvent) {
  emitter.emit(event);
}
