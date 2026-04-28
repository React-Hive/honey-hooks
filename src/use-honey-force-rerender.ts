import { useCallback, useState } from 'react';

/**
 * Creates a stable callback that forces the component to rerender.
 *
 * Useful when mutable refs are updated and the component needs to rerun effects
 * or refresh derived values without storing meaningful state.
 *
 * @returns A stable callback that forces a rerender.
 *
 * @example
 * ```tsx
 * const forceRerender = useHoneyForceRerender();
 *
 * const setElementRef = useCallback((element: Nullable<HTMLDivElement>) => {
 *   elementRef.current = element;
 *
 *   forceRerender();
 * }, []);
 * ```
 */
export const useHoneyForceRerender = () => {
  const [, setState] = useState(0);

  return useCallback(() => {
    setState(value => value + 1);
  }, []);
};
