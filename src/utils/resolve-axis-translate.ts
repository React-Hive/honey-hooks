import { resolveBoundedDelta } from '@react-hive/honey-utils';

import type { Nullable } from '../types';

interface ResolveAxisTranslateOptions {
  /**
   * Drag delta for the axis (deltaX or deltaY).
   */
  delta: number;
  /**
   * Current translate value for the axis.
   */
  translate: number;
  /**
   * Visible container size for the axis (width or height).
   */
  containerSize: number;
  /**
   * Overflow size for the axis.
   */
  overflowSize: number;
  /**
   * Overscroll window percentage.
   */
  overscrollPct: number;
}

export const resolveAxisTranslate = ({
  delta,
  translate,
  containerSize,
  overflowSize,
  overscrollPct,
}: ResolveAxisTranslateOptions): Nullable<number> => {
  if (overflowSize <= 0) {
    return null;
  }

  const threshold = containerSize * (overscrollPct / 100);

  return resolveBoundedDelta({
    delta,
    value: translate,
    min: -(overflowSize + threshold),
    max: threshold,
  });
};
