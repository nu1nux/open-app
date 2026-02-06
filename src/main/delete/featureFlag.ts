/**
 * @fileoverview Main-process feature flag helpers for delete transactions.
 * @module main/delete/featureFlag
 */

/**
 * Defaults to enabled. Set OPEN_APP_DELETE_TRANSACTIONS_V1=0 to disable.
 */
export function isDeleteTransactionsEnabled() {
  return process.env.OPEN_APP_DELETE_TRANSACTIONS_V1 !== '0';
}
