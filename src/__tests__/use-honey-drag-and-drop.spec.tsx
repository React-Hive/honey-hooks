import React from 'react';
import { cleanup, render } from '@testing-library/react';

import type { UseHoneyDragAndDropOptions } from '../use-honey-drag-and-drop';
import {
  HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME,
  HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME,
  useHoneyDragAndDrop,
} from '../use-honey-drag-and-drop';

const createDragEvent = (type: string) =>
  new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as DragEvent;

interface TestComponentProps extends Partial<UseHoneyDragAndDropOptions<HTMLDivElement>> {
  onDrop?: UseHoneyDragAndDropOptions<HTMLDivElement>['onDrop'];
}

const TestComponent = ({
  onDragStart,
  onDragEnd,
  onDrop = vi.fn(),
  enabled,
}: TestComponentProps) => {
  const { setDropZoneRef } = useHoneyDragAndDrop<HTMLDivElement>({
    onDragStart,
    onDragEnd,
    onDrop,
    enabled,
  });

  return (
    <div>
      <div data-testid="drop-zone" ref={setDropZoneRef}>
        Drop zone
      </div>
    </div>
  );
};

afterEach(() => {
  cleanup();
});

describe('[useHoneyDragAndDrop]: basic behaviour', () => {
  it('should add drop zone highlight class when drag enters the document', () => {
    const onDragStart = vi.fn();

    const { getByTestId } = render(<TestComponent onDragStart={onDragStart} />);

    const dropZone = getByTestId('drop-zone');
    const event = createDragEvent('dragenter');

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragStart).toHaveBeenCalledWith(dropZone, event);
  });

  it('should call onDragStart only once during the same drag operation', () => {
    const onDragStart = vi.fn();

    render(<TestComponent onDragStart={onDragStart} />);

    document.dispatchEvent(createDragEvent('dragenter'));
    document.dispatchEvent(createDragEvent('dragenter'));

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it('should keep dragging active while nested drag targets are still inside the document', () => {
    const onDragEnd = vi.fn();

    const { getByTestId } = render(<TestComponent onDragEnd={onDragEnd} />);

    const dropZone = getByTestId('drop-zone');

    document.dispatchEvent(createDragEvent('dragenter'));
    document.dispatchEvent(createDragEvent('dragenter'));

    document.dispatchEvent(createDragEvent('dragleave'));

    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(onDragEnd).not.toHaveBeenCalled();

    document.dispatchEvent(createDragEvent('dragleave'));

    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('should remove highlight classes and call onDragEnd when drag leaves the document', () => {
    const onDragEnd = vi.fn();

    const { getByTestId } = render(<TestComponent onDragEnd={onDragEnd} />);

    const dropZone = getByTestId('drop-zone');

    const dragEnterEvent = createDragEvent('dragenter');
    const dragLeaveEvent = createDragEvent('dragleave');

    document.dispatchEvent(dragEnterEvent);
    dropZone.dispatchEvent(createDragEvent('dragover'));

    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);

    document.dispatchEvent(dragLeaveEvent);

    expect(dragLeaveEvent.defaultPrevented).toBe(true);

    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);

    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledWith(dropZone, dragLeaveEvent);
  });

  it('should add over class when dragging over the drop zone', () => {
    const { getByTestId } = render(<TestComponent />);

    const dropZone = getByTestId('drop-zone');
    const event = createDragEvent('dragover');

    dropZone.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);
  });

  it('should remove over class when dragging leaves the drop zone', () => {
    const { getByTestId } = render(<TestComponent />);

    const dropZone = getByTestId('drop-zone');

    dropZone.dispatchEvent(createDragEvent('dragover'));

    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);

    const dragLeaveEvent = createDragEvent('dragleave');

    dropZone.dispatchEvent(dragLeaveEvent);

    expect(dragLeaveEvent.defaultPrevented).toBe(true);
    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);
  });

  it('should call onDrop when item is dropped on the drop zone', () => {
    const onDrop = vi.fn();
    const onDragEnd = vi.fn();

    const { getByTestId } = render(<TestComponent onDrop={onDrop} onDragEnd={onDragEnd} />);

    const dropZone = getByTestId('drop-zone');

    document.dispatchEvent(createDragEvent('dragenter'));
    dropZone.dispatchEvent(createDragEvent('dragover'));

    const dropEvent = createDragEvent('drop');

    dropZone.dispatchEvent(dropEvent);

    expect(dropEvent.defaultPrevented).toBe(true);
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(dropZone, dropEvent);

    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);

    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledWith(dropZone, dropEvent);
  });

  it('should clean drag state when item is dropped outside the drop zone', () => {
    const onDrop = vi.fn();
    const onDragEnd = vi.fn();

    const { getByTestId } = render(<TestComponent onDrop={onDrop} onDragEnd={onDragEnd} />);

    const dropZone = getByTestId('drop-zone');

    document.dispatchEvent(createDragEvent('dragenter'));
    dropZone.dispatchEvent(createDragEvent('dragover'));

    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);

    const documentDropEvent = createDragEvent('drop');

    document.dispatchEvent(documentDropEvent);

    expect(documentDropEvent.defaultPrevented).toBe(true);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalledTimes(1);

    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);
  });

  it('should not attach listeners when disabled', () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();
    const onDrop = vi.fn();

    const { getByTestId } = render(
      <TestComponent
        enabled={false}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDrop={onDrop}
      />,
    );

    const dropZone = getByTestId('drop-zone');

    document.dispatchEvent(createDragEvent('dragenter'));
    dropZone.dispatchEvent(createDragEvent('dragover'));
    dropZone.dispatchEvent(createDragEvent('drop'));

    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);

    expect(onDragStart).not.toHaveBeenCalled();
    expect(onDragEnd).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('should clear classes when disabled after being enabled', () => {
    const { getByTestId, rerender } = render(<TestComponent enabled />);

    const dropZone = getByTestId('drop-zone');

    document.dispatchEvent(createDragEvent('dragenter'));
    dropZone.dispatchEvent(createDragEvent('dragover'));

    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);

    rerender(<TestComponent enabled={false} />);

    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);
  });

  it('should use latest callbacks without reattaching listeners', () => {
    const firstOnDrop = vi.fn();
    const secondOnDrop = vi.fn();

    const { getByTestId, rerender } = render(<TestComponent onDrop={firstOnDrop} />);

    const dropZone = getByTestId('drop-zone');

    rerender(<TestComponent onDrop={secondOnDrop} />);

    document.dispatchEvent(createDragEvent('dragenter'));
    dropZone.dispatchEvent(createDragEvent('drop'));

    expect(firstOnDrop).not.toHaveBeenCalled();
    expect(secondOnDrop).toHaveBeenCalledTimes(1);
  });

  it('should remove classes and reset drag state on unmount', () => {
    const onDragEnd = vi.fn();

    const { getByTestId, unmount } = render(<TestComponent onDragEnd={onDragEnd} />);

    const dropZone = getByTestId('drop-zone');

    document.dispatchEvent(createDragEvent('dragenter'));
    dropZone.dispatchEvent(createDragEvent('dragover'));

    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);

    unmount();

    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_CLASS_NAME);
    expect(dropZone).not.toHaveClass(HONEY_HIGHLIGHT_DROP_ZONE_OVER_CLASS_NAME);
  });

  it('should not react to document events after unmount', () => {
    const onDragStart = vi.fn();

    const { unmount } = render(<TestComponent onDragStart={onDragStart} />);

    unmount();

    document.dispatchEvent(createDragEvent('dragenter'));

    expect(onDragStart).not.toHaveBeenCalled();
  });
});
