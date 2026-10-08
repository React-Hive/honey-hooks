import type { Nullable } from '../types';

/**
 * Revokes an object URL asynchronously.
 *
 * Delaying revocation avoids conflicts with cases where the URL
 * may still be used during the current execution frame.
 *
 * @param url - Object URL to revoke.
 */
export const revokeObjectURL = (url: Nullable<string>) => {
  if (url) {
    // Revoke the URL asynchronously to avoid conflicts with its usage
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
};
