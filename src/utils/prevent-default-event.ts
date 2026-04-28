/**
 * Prevents the browser's default drag-and-drop behavior and stops the event
 * from bubbling further.
 *
 * This is required to allow custom drop handling and to prevent the browser
 * from opening dropped files.
 *
 * @param e - The event to prevent.
 */
export const preventDefaultEvent = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
};
