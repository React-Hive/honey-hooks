import { useCallback, useEffect, useRef } from 'react';

import { Nullable } from './types';
import { preventDefaultEvent } from './utils';
import { useHoneyLatest } from './use-honey-latest';
import { useHoneyForceRerender } from './use-honey-force-rerender';

/**
 * Class name applied to the drop zone while a drag operation is active
 * anywhere within the document.
 */
export const HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME = 'honey__highlight-drop-zone';

/**
 * Class name applied to the drop zone while the dragged item is directly
 * over the drop zone element.
 */
export const HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME = 'honey__highlight-drop-zone-over';

/**
 * Callback invoked once when a drag operation enters the document.
 *
 * @template Element - The drop zone element type.
 *
 * @param dropZoneElement - The current drop zone element, or `null` if it is not mounted.
 * @param e - The native drag event.
 */
export type UseHoneyDragAndDropStartHandler<Element extends HTMLElement> = (
  dropZoneElement: Nullable<Element>,
  e: DragEvent,
) => void;

/**
 * Callback invoked when a drag operation ends.
 *
 * This can happen when the dragged item leaves the document or after a drop.
 *
 * @template Element - The drop zone element type.
 *
 * @param dropZoneElement - The current drop zone element, or `null` if it is not mounted.
 * @param e - The native drag event.
 */
export type UseHoneyDragAndDropEndHandler<Element extends HTMLElement> = (
  dropZoneElement: Nullable<Element>,
  e: DragEvent,
) => void;

/**
 * Callback invoked when an item is dropped on the drop zone element.
 *
 * @template Element - The drop zone element type.
 *
 * @param dropZoneElement - The current drop zone element, or `null` if it is not mounted.
 * @param e - The native drag event.
 */
export type UseHoneyDragAndDropDropHandler<Element extends HTMLElement> = (
  dropZoneElement: Nullable<Element>,
  e: DragEvent,
) => void;

/**
 * Callback ref used to register or unregister the drop zone element.
 *
 * Pass this handler to the target element's `ref` prop.
 *
 * @template Element - The drop zone element type.
 *
 * @param dropZoneElement - The mounted drop zone element, or `null` when unmounted.
 */
export type UseHoneyDragAndDropSetElementHandler<Element extends HTMLElement> = (
  dropZoneElement: Nullable<Element>,
) => void;

/**
 * Options for configuring the `useDragAndDrop` hook.
 *
 * @template Element - The drop zone element type.
 */
export interface UseHoneyDragAndDropOptions<Element extends HTMLElement> {
  /**
   * Callback invoked when an item is dropped on the drop zone element.
   */
  onDrop: UseHoneyDragAndDropDropHandler<Element>;
  /**
   * Optional callback invoked once when a drag operation enters the document.
   */
  onDragStart?: UseHoneyDragAndDropStartHandler<Element>;
  /**
   * Optional callback invoked when a drag operation leaves the document or after drop.
   */
  onDragEnd?: UseHoneyDragAndDropEndHandler<Element>;
  /**
   * Whether drag-and-drop handling is enabled.
   *
   * When disabled, event listeners are not attached and highlight classes are removed.
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * Adds document-level drag tracking and drop-zone-specific drop handling.
 *
 * The hook highlights the drop zone when a drag operation enters the document,
 * applies an additional class when the dragged item is directly over the drop zone,
 * and invokes the provided callbacks for drag start, drag end, and drop events.
 *
 * Native event listeners are attached directly to the document and drop zone element.
 * Latest callback references are used internally, so changing callback props does not
 * require re-attaching all listeners.
 *
 * @template Element - The drop zone element type.
 *
 * @param options - Hook configuration.
 *
 * @returns An object containing a callback ref to assign to the drop zone element.
 *
 * @example
 * ```tsx
 * const { setDropZoneRef } = useDragAndDrop<HTMLDivElement>({
 *   onDrop: (dropZoneElement, e) => {
 *     const files = Array.from(e.dataTransfer?.files ?? []);
 *
 *     console.log(dropZoneElement, files);
 *   },
 * });
 *
 * return <div ref={setDropZoneRef}>Drop files here</div>;
 * ```
 */
export const useHoneyDragAndDrop = <Element extends HTMLElement>({
  onDragStart,
  onDragEnd,
  onDrop,
  enabled = true,
}: UseHoneyDragAndDropOptions<Element>) => {
  const forceRerender = useHoneyForceRerender();

  const dropZoneRef = useRef<Nullable<Element>>(null);
  /**
   * Tracks nested document-level drag enter/leave events to avoid ending the
   * drag operation too early when moving between child elements.
   */
  const dragDepthRef = useRef(0);
  const isDraggingRef = useRef(false);

  /**
   * Latest callback refs prevent native listeners from capturing stale closures.
   */
  const onDragStartRef = useHoneyLatest(onDragStart);
  const onDragEndRef = useHoneyLatest(onDragEnd);
  const onDropRef = useHoneyLatest(onDrop);

  const clearDropZoneClasses = useCallback((dropZoneElement = dropZoneRef.current) => {
    dropZoneElement?.classList.remove(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    dropZoneElement?.classList.remove(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);
  }, []);

  /**
   * Starts a drag operation if one is not already active.
   *
   * @param e - The native drag event that started the operation.
   */
  const startDragging = useCallback((e: DragEvent) => {
    if (isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = true;

    dropZoneRef.current?.classList.add(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);

    onDragStartRef.current?.(dropZoneRef.current, e);
  }, []);

  /**
   * Ends the current drag operation and clears all drag-related state.
   *
   * @param e - The native drag event that ended the operation.
   */
  const endDragging = useCallback((e: DragEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    dragDepthRef.current = 0;
    isDraggingRef.current = false;

    clearDropZoneClasses();

    onDragEndRef.current?.(dropZoneRef.current, e);
  }, []);

  /**
   * Handles drag entering the document.
   *
   * Increments drag depth and starts the drag operation if needed.
   *
   * @param e - The native drag event.
   */
  const handleDocumentDragEnter = useCallback((e: DragEvent) => {
    preventDefaultEvent(e);

    dragDepthRef.current += 1;

    startDragging(e);
  }, []);

  /**
   * Handles dragging over the document.
   *
   * Prevents the browser's default drag behavior.
   *
   * @param e - The native drag event.
   */
  const handleDocumentDragOver = useCallback((e: DragEvent) => {
    preventDefaultEvent(e);
  }, []);

  /**
   * Handles drag leaving the document.
   *
   * Decrements drag depth and ends the drag operation when no nested drag targets remain.
   *
   * @param e - The native drag event.
   */
  const handleDocumentDragLeave = useCallback((e: DragEvent) => {
    preventDefaultEvent(e);

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      endDragging(e);
    }
  }, []);

  /**
   * Handles dropping anywhere in the document.
   *
   * This is used only to clean up drag state when the item is dropped outside
   * the actual drop zone.
   *
   * @param e - The native drag event.
   */
  const handleDocumentDrop = useCallback((e: DragEvent) => {
    preventDefaultEvent(e);

    endDragging(e);
  }, []);

  /**
   * Handles dragging directly over the drop zone element.
   *
   * Adds the drop-zone-over highlight class.
   *
   * @param e - The native drag event.
   */
  const handleDropZoneDragOver = useCallback((e: DragEvent) => {
    preventDefaultEvent(e);

    dropZoneRef.current?.classList.add(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);
  }, []);

  /**
   * Handles drag leaving the drop zone element.
   *
   * Removes the drop-zone-over highlight class.
   *
   * @param e - The native drag event.
   */
  const handleDropZoneDragLeave = useCallback((e: DragEvent) => {
    preventDefaultEvent(e);

    dropZoneRef.current?.classList.remove(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);
  }, []);

  /**
   * Handles dropping directly on the drop zone element.
   *
   * Invokes the latest `onDrop` callback and then ends the active drag operation.
   *
   * @param e - The native drag event.
   */
  const handleDrop = useCallback((e: DragEvent) => {
    preventDefaultEvent(e);

    onDropRef.current(dropZoneRef.current, e);

    endDragging(e);
  }, []);

  /**
   * Callback ref used to register the drop zone element.
   *
   * A rerender is triggered so the effect can attach listeners to the latest
   * mounted element.
   *
   * @param dropZoneElement - The mounted drop zone element, or `null` when unmounted.
   */
  const setDropZoneRef = useCallback<UseHoneyDragAndDropSetElementHandler<Element>>(
    dropZoneElement => {
      dropZoneRef.current = dropZoneElement;

      forceRerender();
    },
    [],
  );

  useEffect(() => {
    const dropZoneElement = dropZoneRef.current;

    if (!enabled || !dropZoneElement) {
      clearDropZoneClasses();

      return;
    }

    document.addEventListener('dragenter', handleDocumentDragEnter);
    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('dragleave', handleDocumentDragLeave);
    document.addEventListener('drop', handleDocumentDrop);

    dropZoneElement.addEventListener('dragover', handleDropZoneDragOver);
    dropZoneElement.addEventListener('dragleave', handleDropZoneDragLeave);
    dropZoneElement.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDocumentDragEnter);
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('dragleave', handleDocumentDragLeave);
      document.removeEventListener('drop', handleDocumentDrop);

      dropZoneElement.removeEventListener('dragover', handleDropZoneDragOver);
      dropZoneElement.removeEventListener('dragleave', handleDropZoneDragLeave);
      dropZoneElement.removeEventListener('drop', handleDrop);

      clearDropZoneClasses(dropZoneElement);

      dragDepthRef.current = 0;
      isDraggingRef.current = false;
    };
  }, [enabled]);

  return {
    dropZoneRef,
    setDropZoneRef,
  };
};
