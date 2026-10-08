import React, { Activity, StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHoneyObjectUrls } from '../use-honey-object-urls';

describe('[useHoneyObjectUrls]: basic behavior', () => {
  let createdUrls: string[];

  const createObjectURLMock = vi.fn();
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();

    createdUrls = [];

    createObjectURLMock.mockReset();
    revokeObjectURLMock.mockReset();

    createObjectURLMock.mockImplementation(() => {
      const url = `blob:url-${createdUrls.length + 1}`;

      createdUrls.push(url);

      return url;
    });

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const createBlob = (text: string) => new Blob([text], { type: 'text/plain' });

  it('should return an empty map when no objects are provided', () => {
    const { result } = renderHook(() => useHoneyObjectUrls([]));

    expect(result.current.size).toBe(0);
    expect(createObjectURLMock).not.toHaveBeenCalled();
  });

  it('should create an object URL for each object', () => {
    const firstBlob = createBlob('first');
    const secondBlob = createBlob('second');

    const { result } = renderHook(() => useHoneyObjectUrls([firstBlob, secondBlob]));

    expect(result.current.get(firstBlob)).toBe('blob:url-1');
    expect(result.current.get(secondBlob)).toBe('blob:url-2');

    expect(createObjectURLMock).toHaveBeenCalledTimes(2);
  });

  it('should keep the URL of an object that stays when another is added', () => {
    const firstBlob = createBlob('first');
    const secondBlob = createBlob('second');

    const { result, rerender } = renderHook(({ blobs }) => useHoneyObjectUrls(blobs), {
      initialProps: {
        blobs: [firstBlob],
      },
    });

    rerender({
      blobs: [firstBlob, secondBlob],
    });

    expect(result.current.get(firstBlob)).toBe('blob:url-1');
    expect(result.current.get(secondBlob)).toBe('blob:url-2');

    expect(createObjectURLMock).toHaveBeenCalledTimes(2);

    act(() => vi.runAllTimers());

    expect(revokeObjectURLMock).not.toHaveBeenCalled();
  });

  it('should revoke the URL of an object that leaves the list', () => {
    const firstBlob = createBlob('first');
    const secondBlob = createBlob('second');

    const { result, rerender } = renderHook(({ blobs }) => useHoneyObjectUrls(blobs), {
      initialProps: {
        blobs: [firstBlob, secondBlob],
      },
    });

    rerender({
      blobs: [secondBlob],
    });

    expect(result.current.has(firstBlob)).toBe(false);
    expect(result.current.get(secondBlob)).toBe('blob:url-2');

    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());

    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:url-1');
  });

  it('should keep the same map while its objects stay the same', () => {
    const blob = createBlob('test');

    const { result, rerender } = renderHook(({ blobs }) => useHoneyObjectUrls(blobs), {
      initialProps: {
        blobs: [blob],
      },
    });

    const objectUrls = result.current;

    rerender({
      blobs: [blob],
    });

    expect(result.current).toBe(objectUrls);
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
  });

  it('should create one URL for an object listed twice', () => {
    const blob = createBlob('test');

    const { result, rerender } = renderHook(({ blobs }) => useHoneyObjectUrls(blobs), {
      initialProps: {
        blobs: [blob, blob],
      },
    });

    rerender({
      blobs: [blob, blob],
    });

    expect(result.current.size).toBe(1);
    expect(result.current.get(blob)).toBe('blob:url-1');
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
  });

  it('should revoke every URL on unmount', () => {
    const firstBlob = createBlob('first');
    const secondBlob = createBlob('second');

    const { unmount } = renderHook(() => useHoneyObjectUrls([firstBlob, secondBlob]));

    unmount();

    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());

    expect(revokeObjectURLMock).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:url-1');
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:url-2');
  });

  it('should hand out no revoked URL while an Activity hides and shows it again', () => {
    const blob = createBlob('test');

    const renderedUrls: (string | undefined)[] = [];

    let mode: 'visible' | 'hidden' = 'visible';

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Activity mode={mode}>{children}</Activity>
    );

    const { result, rerender } = renderHook(
      () => {
        const objectUrls = useHoneyObjectUrls([blob]);

        renderedUrls.push(objectUrls.get(blob));

        return objectUrls;
      },
      { wrapper },
    );

    expect(result.current.get(blob)).toBe('blob:url-1');

    mode = 'hidden';
    rerender();

    act(() => vi.runAllTimers());

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:url-1');

    const rendersBeforeShowing = renderedUrls.length;

    mode = 'visible';
    rerender();

    expect(renderedUrls.slice(rendersBeforeShowing)).not.toContain('blob:url-1');
    expect(result.current.get(blob)).toBe('blob:url-2');
  });

  it('should end with live URLs and leak none in StrictMode', () => {
    const firstBlob = createBlob('first');
    const secondBlob = createBlob('second');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );

    const { result, unmount } = renderHook(() => useHoneyObjectUrls([firstBlob, secondBlob]), {
      wrapper,
    });

    act(() => vi.runAllTimers());

    const liveUrls = [result.current.get(firstBlob), result.current.get(secondBlob)];

    expect(liveUrls.every(url => url?.startsWith('blob:url-'))).toBe(true);
    expect(liveUrls.some(url => revokeObjectURLMock.mock.calls.flat().includes(url))).toBe(false);

    unmount();

    act(() => vi.runAllTimers());

    expect(revokeObjectURLMock.mock.calls.flat().sort()).toEqual([...createdUrls].sort());
  });
});
