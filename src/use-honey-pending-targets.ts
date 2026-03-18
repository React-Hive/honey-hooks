import { useCallback, useRef } from 'react';

import type { Nullable } from './types';

type TargetKey = string;

/**
 * API for managing pending targets keyed by a string identifier.
 *
 * Targets are stored temporarily and can be "consumed" once,
 * making this hook useful for deferred attachment scenarios
 * (e.g. IntersectionObserver, ResizeObserver, etc.).
 *
 * @template Target - The type of stored target (e.g. HTMLElement)
 * @template Key - A string union representing allowed keys
 */
export interface HoneyPendingTargetsApi<Target, Key extends TargetKey> {
  /**
   * Stores a target for the given key.
   *
   * @param key - Identifier for the target
   * @param target - Target to store (or `null` to clear)
   */
  set: (key: Key, target: Nullable<Target>) => void;
  /**
   * Checks whether a non-null target exists for the given key.
   *
   * @param key - Identifier for the target
   *
   * @returns `true` if a target is present, otherwise `false`
   */
  has: (key: Key) => boolean;
  /**
   * Retrieves the current target for the given key without removing it.
   *
   * @param key - Identifier for the target
   *
   * @returns The stored target or `null` if none exists
   */
  get: (key: Key) => Nullable<Target>;
  /**
   * Retrieves and removes the target for the given key.
   *
   * After calling this, the stored value becomes `null`.
   *
   * @param key - Identifier for the target
   *
   * @returns The previously stored target or `null`
   */
  consume: (key: Key) => Nullable<Target>;
  /**
   * Clears all stored targets.
   */
  clear: () => void;
}

/**
 * Hook for managing pending (deferred) targets keyed by identifiers.
 *
 * Useful when targets may be assigned before a consumer is ready
 * (e.g. before an observer is initialized). Targets can later be
 * consumed and attached when needed.
 *
 * This hook does not trigger re-renders and is fully ref-based.
 *
 * @template Target - The type of stored target (e.g. HTMLElement)
 * @template Key - A string union representing allowed keys
 *
 * @returns API for managing pending targets
 *
 * @example
 * ```tsx
 * const pendingTargets = useHoneyPendingTargets<HTMLElement, 'top' | 'bottom'>();
 *
 * // store target before observer is ready
 * pendingTargets.set('top', el);
 *
 * // later
 * const target = pendingTargets.consume('top');
 * if (target) {
 *   observer.observe(target);
 * }
 * ```
 */
export const useHoneyPendingTargets = <
  Target,
  Key extends TargetKey = TargetKey,
>(): HoneyPendingTargetsApi<Target, Key> => {
  const pendingTargetsRef = useRef<Record<Key, Nullable<Target>>>(
    {} as Record<Key, Nullable<Target>>,
  );

  const set = useCallback((key: Key, target: Nullable<Target>) => {
    pendingTargetsRef.current[key] = target;
  }, []);

  const has = useCallback((key: Key) => pendingTargetsRef.current[key] != null, []);

  const get = useCallback((key: Key) => pendingTargetsRef.current[key] ?? null, []);

  const consume = useCallback((key: Key) => {
    const target = pendingTargetsRef.current[key] ?? null;

    pendingTargetsRef.current[key] = null;

    return target;
  }, []);

  const clear = useCallback(() => {
    pendingTargetsRef.current = {} as Record<Key, Nullable<Target>>;
  }, []);

  return {
    set,
    has,
    get,
    consume,
    clear,
  };
};
