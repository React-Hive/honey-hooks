import { useEffect } from 'react';

import type { HoneyKeyboardEventCode } from './types';
import { useHoneyLatest } from './use-honey-latest';

/**
 * Callback invoked when a matching `keyup` event is fired on the document.
 *
 * @param keyCode - Released key code from `KeyboardEvent.code`.
 * @param e - Native keyboard event.
 */
export type UseHoneyDocumentOnKeyUpHandler = (
  keyCode: HoneyKeyboardEventCode,
  e: KeyboardEvent,
) => void;

interface UseHoneyDocumentKeyUpOptions {
  /**
   * Whether the event listener should be active.
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * Whether to call `preventDefault()` on matching `keyup` events.
   *
   * This is useful for suppressing default browser behavior
   * (for example, scrolling with the Space key).
   *
   * @default true
   */
  preventDefault?: boolean;
}

/**
 * Subscribes to `keyup` events on the `document` and invokes the callback
 * when one of the specified keys is released.
 *
 * The hook keeps a stable document event listener and always uses the latest
 * `onKeyUp` callback and `listenKeys` values without re-subscribing when they change.
 *
 * @param onKeyUp - Callback invoked when a matching key is released.
 * @param listenKeys - List of `KeyboardEvent.code` values to listen for.
 * @param options - Listener behavior configuration.
 *
 * @example
 * ```tsx
 * useHoneyDocumentKeyUp(
 *   (keyCode, event) => {
 *     console.log('Key released:', keyCode);
 *   },
 *   ['Escape'],
 * );
 * ```
 */
export const useHoneyDocumentKeyUp = (
  onKeyUp: UseHoneyDocumentOnKeyUpHandler,
  listenKeys: HoneyKeyboardEventCode[],
  { enabled = true, preventDefault = true }: UseHoneyDocumentKeyUpOptions = {},
) => {
  const onKeyUpRef = useHoneyLatest(onKeyUp);
  const listenKeysRef = useHoneyLatest(listenKeys);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyCode = e.code as HoneyKeyboardEventCode;

      if (listenKeysRef.current.includes(keyCode)) {
        if (preventDefault) {
          e.preventDefault();
        }

        onKeyUpRef.current(keyCode, e);
      }
    };

    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, preventDefault]);
};
