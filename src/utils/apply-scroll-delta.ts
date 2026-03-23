import type { Axis } from '@react-hive/honey-utils';
import { getXOverflowWidth, getYOverflowHeight, parse2DMatrix } from '@react-hive/honey-utils';

import { resolveAxisTranslate } from './resolve-axis-translate';

interface ApplyScrollDeltaOptions {
  axis: Axis;
  container: HTMLElement;
  deltaX: number;
  deltaY: number;
  overscrollPct: number;
}

export const applyScrollDelta = ({
  axis,
  container,
  deltaX,
  deltaY,
  overscrollPct,
}: ApplyScrollDeltaOptions): boolean => {
  const { translateX, translateY } = parse2DMatrix(container);

  let nextX = translateX;
  let nextY = translateY;
  let shouldScroll = false;

  if (axis === 'x' || axis === 'both') {
    const next = resolveAxisTranslate({
      delta: deltaX,
      translate: translateX,
      containerSize: container.clientWidth,
      overflowSize: getXOverflowWidth(container),
      overscrollPct,
    });

    if (next !== null) {
      nextX = next;
      shouldScroll = true;
    }
  }

  if (axis === 'y' || axis === 'both') {
    const next = resolveAxisTranslate({
      delta: deltaY,
      translate: translateY,
      containerSize: container.clientHeight,
      overflowSize: getYOverflowHeight(container),
      overscrollPct,
    });

    if (next !== null) {
      nextY = next;
      shouldScroll = true;
    }
  }

  if (shouldScroll) {
    container.style.transform = `translate(${nextX}px, ${nextY}px)`;
  }

  return shouldScroll;
};
