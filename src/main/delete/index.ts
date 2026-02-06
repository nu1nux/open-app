/**
 * @fileoverview Delete coordinator singleton bootstrap.
 * @module main/delete
 */

import { DeleteCoordinator, type DeleteCoordinatorDeps } from './coordinator';

let coordinator: DeleteCoordinator | null = null;

export function initDeleteCoordinator(deps: DeleteCoordinatorDeps) {
  coordinator = new DeleteCoordinator(deps);
  return coordinator;
}

export function getDeleteCoordinator() {
  if (!coordinator) {
    throw new Error('DeleteCoordinator not initialized.');
  }
  return coordinator;
}
