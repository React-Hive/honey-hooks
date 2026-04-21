import { useEffect, useRef } from 'react';
import { isFunction } from '@react-hive/honey-utils';
import throttle from 'lodash.throttle';

import { useHoneyLatest } from './use-honey-latest';

/**
 * Cleanup function returned by the resize handler.
 */
type UseHoneyResizeCleanup = () => void;

/**
 * Callback invoked when the resize listener runs.
 *
 * May optionally return a cleanup function. When returned, that cleanup
 * function is called before the next successful handler execution and when
 * the hook is cleaned up.
 */
export type UseHoneyResizeHandler = () => UseHoneyResizeCleanup | undefined;

interface UseHoneyResizeOptions {
  /**
   * Whether to invoke the resize handler immediately after the listener is attached.
   *
   * Useful when initial layout measurements should be performed
   * before any resize events occur.
   *
   * @default false
   */
  invokeOnMount?: boolean;
  /**
   * Throttle delay, in milliseconds, applied to the resize handler.
   *
   * When greater than `0`, the resize listener is throttled using
   * `lodash.throttle` to reduce execution frequency.
   *
   * @default 0
   */
  throttleTime?: number;
  /**
   * Whether the resize listener should be active.
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * Subscribes to the window `resize` event and invokes the provided handler.
 *
 * The handler may optionally return a cleanup function. When provided, the
 * cleanup function is called before the next handler execution and when the
 * hook is cleaned up, such as on unmount or when the effect re-runs.
 *
 * The resize listener can be invoked immediately on mount and optionally
 * throttled to reduce execution frequency for expensive layout work.
 *
 * @param handler - Callback invoked when the resize listener runs.
 * @param options - Configuration options controlling listener behavior.
 *
 * @example
 * ```ts
 * useHoneyResize(() => {
 *   console.log('Window resized');
 * }, { throttleTime: 200 });
 * ```
 *
 * @example
 * ```ts
 * useHoneyResize(() => {
 *   const observer = createResizeSideEffect();
 *
 *   return () => {
 *     observer.disconnect();
 *   };
 * }, { invokeOnMount: true });
 * ```
 */
export const useHoneyResize = (
  handler: UseHoneyResizeHandler,
  { invokeOnMount = false, throttleTime = 0, enabled = true }: UseHoneyResizeOptions = {},
) => {
  const handlerRef = useHoneyLatest(handler);
  const cleanupRef = useRef<ReturnType<UseHoneyResizeHandler>>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const runHandler = () => {
      cleanupRef.current?.();

      const cleanup = handlerRef.current();

      cleanupRef.current = isFunction(cleanup) ? cleanup : undefined;
    };

    const handleResize: typeof runHandler | ReturnType<typeof throttle> = throttleTime
      ? throttle(runHandler, throttleTime)
      : runHandler;

    window.addEventListener('resize', handleResize);

    if (invokeOnMount) {
      runHandler();
    }

    return () => {
      if ('cancel' in handleResize && isFunction(handleResize.cancel)) {
        handleResize.cancel();
      }

      window.removeEventListener('resize', handleResize);

      cleanupRef.current?.();
      cleanupRef.current = undefined;
    };
  }, [enabled, invokeOnMount, throttleTime]);
};
