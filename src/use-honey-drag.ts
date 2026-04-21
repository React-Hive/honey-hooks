import type { RefObject } from 'react';
import { useEffect } from 'react';

import type { Nullable } from './types';
import { useHoneyLatest } from './use-honey-latest';

/**
 * Invoked when a drag gesture is about to start.
 *
 * This handler is called on the initial pointer-down interaction
 * (mouse or touch) before drag tracking begins.
 *
 * It can be used to:
 * - allow or block dragging
 * - capture initial external state
 * - cancel dragging based on application logic
 *
 * @template Element - Draggable element type.
 *
 * @param draggableElement - Element that is about to be dragged.
 * @param e - Pointer event that initiated the drag.
 *
 * @returns Promise resolving to:
 * - `true` to allow dragging
 * - `false` to cancel dragging
 */
export type UseHoneyDragOnStartHandler<Element extends HTMLElement> = (
  draggableElement: Element,
  e: MouseEvent | TouchEvent,
) => Promise<boolean>;

/**
 * Context describing pointer movement during an active drag gesture.
 *
 * All values are expressed in **pixels** and are relative
 * to the drag start or previous frame as noted.
 */
export interface UseHoneyDragOnMoveContext {
  /**
   * Horizontal delta since the previous move event.
   *
   * Positive values indicate movement to the right.
   */
  deltaX: number;
  /**
   * Vertical delta since the previous move event.
   *
   * Positive values indicate movement downward.
   */
  deltaY: number;
  /**
   * Total horizontal displacement from the drag start position.
   */
  distanceX: number;
  /**
   * Total vertical displacement from the drag start position.
   */
  distanceY: number;
}

/**
 * Creates a move callback for the current drag gesture.
 *
 * The returned callback is invoked on each pointer move and receives
 * incremental and total movement data.
 *
 * Returning `false` from the move callback immediately terminates the drag.
 *
 * @template Element - The draggable element type.
 *
 * @param draggableElement - The element being dragged.
 *
 * @returns A function invoked on every pointer move, receiving
 *          {@link UseHoneyDragOnMoveContext}, and resolving to:
 *          - `true` to continue dragging
 *          - `false` to stop dragging immediately
 */
export type UseHoneyDragOnMoveHandler<Element extends HTMLElement> = (
  draggableElement: Element,
) => (context: UseHoneyDragOnMoveContext) => Promise<boolean>;

/**
 * Context describing the final state of a completed drag gesture.
 *
 * This context exposes **release velocity**, which is suitable for
 * inertia, momentum, or decay-based motion systems.
 */
interface UseHoneyDragOnEndContext {
  /**
   * Total horizontal displacement from drag start to release.
   */
  deltaX: number;
  /**
   * Total vertical displacement from drag start to release.
   */
  deltaY: number;
  /**
   * Horizontal release velocity in pixels per millisecond (`px/ms`).
   *
   * This value represents the **instantaneous velocity at release**
   * and is suitable for inertia or momentum-based motion.
   */
  velocityXPxMs: number;
  /**
   * Vertical release velocity in pixels per millisecond (`px/ms`).
   *
   * This value represents the **instantaneous velocity at release**
   * and is suitable for inertia or momentum-based motion.
   */
  velocityYPxMs: number;
}

/**
 * Invoked when a drag gesture ends.
 *
 * This handler is called when:
 * - the pointer is released
 * - the drag is stopped programmatically, unless skipped
 *
 * It receives final drag displacement and release velocity.
 *
 * @template Element - Draggable element type.
 *
 * @param context - Final drag metrics.
 * @param draggableElement - Element that was dragged.
 * @param e - Pointer event that finished the drag.
 *
 * @returns Promise resolved when end-of-drag logic completes.
 */
export type UseHoneyDragOnEndHandler<Element extends HTMLElement> = (
  context: UseHoneyDragOnEndContext,
  draggableElement: Element,
  e: MouseEvent | TouchEvent,
) => Promise<void>;

/**
 * Handlers controlling the drag gesture lifecycle.
 *
 * Together, these handlers define:
 * - whether dragging can start
 * - how movement is handled
 * - what happens when dragging ends
 */
export interface UseHoneyDragHandlers<Element extends HTMLElement> {
  /**
   * Optional handler triggered when the drag operation starts.
   * This is useful for capturing the initial state or performing any setup actions before the drag starts.
   *
   * @param element - The element being dragged.
   *
   * @returns A boolean or Promise resolving to a boolean indicating if the drag should proceed.
   */
  onStartDrag?: UseHoneyDragOnStartHandler<Element>;
  /**
   * Required handler triggered continuously during the drag operation.
   * This handler is responsible for updating the drag state and typically tracks the element's movement.
   *
   * @param element - The element being dragged.
   *
   * @returns A boolean or Promise resolving to a boolean indicating whether the drag should continue.
   */
  onMoveDrag: UseHoneyDragOnMoveHandler<Element>;
  /**
   * Optional handler triggered when the drag operation ends.
   * This is commonly used for cleanup or finalizing the drag process.
   *
   * @param context - Contains information about the drag operation, such as distance and speed.
   * @param element - The element being dragged.
   *
   * @returns A Promise.
   */
  onEndDrag?: UseHoneyDragOnEndHandler<Element>;
}

/**
 * Options controlling drag behavior.
 */
export interface UseHoneyDragOptions<
  Element extends HTMLElement,
> extends UseHoneyDragHandlers<Element> {
  /**
   * Controls whether the `onEndDrag` handler is skipped when the drag operation is forcibly stopped.
   * This can be useful when dragging is interrupted or terminated early due to movement restrictions.
   *
   * @default false
   */
  skipOnEndDragWhenStopped?: boolean;
  /**
   * Whether dragging is enabled.
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * Enables mouse and touch dragging for an element.
 *
 * The hook:
 * - tracks drag movement for mouse and touch input
 * - computes instantaneous release velocity using `performance.now()`
 * - emits drag lifecycle events for start, move, and end
 * - keeps DOM event subscriptions stable while always using the latest handler references
 *
 * Handler behavior:
 * - `onStartDrag`, `onMoveDrag`, and `onEndDrag` are read through `useHoneyLatest`
 * - listener subscriptions are not recreated when handler identities change
 * - the latest `onMoveDrag` factory is used for the attached element
 *
 * Architectural notes:
 * - velocity is computed during movement, not at drag end
 * - no layout reads or writes are performed internally
 * - supports both mouse and touch input
 *
 * @template Element - Draggable HTML element type.
 *
 * @param draggableElementRef - Ref pointing to the draggable element.
 * @param options - Drag lifecycle handlers and configuration.
 */
export const useHoneyDrag = <Element extends HTMLElement>(
  draggableElementRef: RefObject<Nullable<Element>>,
  {
    skipOnEndDragWhenStopped = false,
    enabled = true,
    onMoveDrag,
    onStartDrag,
    onEndDrag,
  }: UseHoneyDragOptions<Element>,
) => {
  const onStartDragRef = useHoneyLatest(onStartDrag);
  const onMoveDragRef = useHoneyLatest(onMoveDrag);
  const onEndDragRef = useHoneyLatest(onEndDrag);

  useEffect(() => {
    const draggableElement = draggableElementRef.current;

    if (!enabled || !draggableElement) {
      return;
    }

    const onMove = onMoveDragRef.current(draggableElement);

    let isDragging = false;

    let startX = 0;
    let startY = 0;

    let lastX = 0;
    let lastY = 0;
    let lastMoveTimeMs = 0;

    let velocityXPxMs = 0;
    let velocityYPxMs = 0;

    const startDrag = async (clientX: number, clientY: number, e: MouseEvent | TouchEvent) => {
      if (onStartDragRef.current && !(await onStartDragRef.current(draggableElement, e))) {
        return;
      }

      lastMoveTimeMs = performance.now();

      isDragging = true;

      startX = clientX;
      startY = clientY;
      lastX = clientX;
      lastY = clientY;

      velocityXPxMs = 0;
      velocityYPxMs = 0;
    };

    const stopDrag = async (shouldTriggerOnEndDrag: boolean, e: MouseEvent | TouchEvent) => {
      if (!isDragging) {
        return;
      }

      isDragging = false;

      if (shouldTriggerOnEndDrag && onEndDragRef.current) {
        const deltaX = lastX - startX;
        const deltaY = lastY - startY;

        const endContext: UseHoneyDragOnEndContext = {
          deltaX,
          deltaY,
          velocityXPxMs,
          velocityYPxMs,
        };

        await onEndDragRef.current(endContext, draggableElement, e);
      }
    };

    const releaseDrag = async (shouldTriggerOnEndDrag: boolean, e: MouseEvent | TouchEvent) => {
      await stopDrag(shouldTriggerOnEndDrag, e);

      window.removeEventListener('mousemove', mouseMoveHandler, { capture: true });
      window.removeEventListener('mouseup', mouseUpHandler, { capture: true });

      window.removeEventListener('touchmove', touchMoveHandler, { capture: true });
      window.removeEventListener('touchend', touchEndHandler, { capture: true });
      window.removeEventListener('touchcancel', touchCancelHandler, { capture: true });
    };

    const mouseUpHandler = async (e: MouseEvent) => {
      await releaseDrag(true, e);
    };

    const moveHandler = async (clientX: number, clientY: number, e: MouseEvent | TouchEvent) => {
      if (!isDragging) {
        return;
      }

      const nowMs = performance.now();
      const deltaTimeMs = nowMs - lastMoveTimeMs;

      const deltaX = clientX - lastX;
      const deltaY = clientY - lastY;

      if (deltaTimeMs > 0) {
        velocityXPxMs = deltaX / deltaTimeMs;
        velocityYPxMs = deltaY / deltaTimeMs;
      }

      const distanceX = clientX - startX;
      const distanceY = clientY - startY;

      const isContinue = await onMove({
        deltaX,
        deltaY,
        distanceX,
        distanceY,
      });

      lastX = clientX;
      lastY = clientY;
      lastMoveTimeMs = nowMs;

      if (!isContinue) {
        await releaseDrag(!skipOnEndDragWhenStopped, e);
      }
    };

    const mouseMoveHandler = async (e: MouseEvent) => {
      await moveHandler(e.clientX, e.clientY, e);
    };

    const touchMoveHandler = async (e: TouchEvent) => {
      const touch = e.touches[0];

      await moveHandler(touch.clientX, touch.clientY, e);
    };

    const touchEndHandler = async (e: TouchEvent) => {
      await releaseDrag(true, e);
    };

    const touchCancelHandler = async (e: TouchEvent) => {
      await releaseDrag(true, e);
    };

    const touchStartHandler = async (e: TouchEvent) => {
      e.stopPropagation();

      const touch = e.touches[0];

      await startDrag(touch.clientX, touch.clientY, e);

      window.addEventListener('touchmove', touchMoveHandler, {
        passive: true,
        capture: true,
      });
      window.addEventListener('touchend', touchEndHandler, { capture: true });
      window.addEventListener('touchcancel', touchCancelHandler, { capture: true });
    };

    const mouseDownHandler = async (e: MouseEvent) => {
      e.stopPropagation();

      await startDrag(e.clientX, e.clientY, e);

      window.addEventListener('mousemove', mouseMoveHandler, { capture: true });
      window.addEventListener('mouseup', mouseUpHandler, { capture: true });
    };

    draggableElement.addEventListener('mousedown', mouseDownHandler);
    draggableElement.addEventListener('touchstart', touchStartHandler, {
      passive: true,
    });

    return () => {
      draggableElement.removeEventListener('mousedown', mouseDownHandler);
      draggableElement.removeEventListener('touchstart', touchStartHandler);
    };
  }, [enabled]);
};
