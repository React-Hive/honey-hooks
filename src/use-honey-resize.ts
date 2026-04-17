import { useEffect, useRef } from 'react';
import { isFunction } from '@react-hive/honey-utils';
import throttle from 'lodash.throttle';

type UseHoneyResizeCleanup = () => void;

/**
 * Callback invoked when the resize listener runs.
 *
 * May optionally return a cleanup function. When returned, that cleanup
 * function is called before the next handler execution and when the hook
 * is cleaned up.
 */
export type UseHoneyResizeHandler = () => UseHoneyResizeCleanup | undefined;

interface UseHoneyResizeOptions {
  /**
   * Whether to invoke the resize handler immediately on mount.
   *
   * Useful when initial layout measurements should be performed
   * before any resize events occur.
   *
   * @default false
   */
  invokeOnMount?: boolean;
  /**
   * Throttle delay (in milliseconds) applied to the resize handler.
   *
   * When greater than `0`, the handler will be throttled using
   * `lodash.throttle` to reduce invocation frequency.
   *
   * @default 0
   */
  throttleTime?: number;
  /**
   * Enables or disables the resize listener.
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
 * hook is cleaned up, such as on unmount or when dependencies change.
 *
 * The handler can also be invoked immediately on mount and optionally
 * throttled to reduce execution frequency for expensive layout work.
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
 *
 * @param handler - Callback invoked when the resize listener runs.
 * @param options - Configuration options controlling listener behavior.
 */
export const useHoneyResize = (
  handler: UseHoneyResizeHandler,
  { invokeOnMount = false, throttleTime = 0, enabled = true }: UseHoneyResizeOptions = {},
) => {
  const cleanupRef = useRef<ReturnType<UseHoneyResizeHandler>>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const runHandler = () => {
      cleanupRef.current?.();

      const cleanup = handler();

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
  }, [enabled, invokeOnMount, throttleTime, handler]);
};
