import React, { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHoneyObjectUrl } from '../use-honey-object-url';

describe('[useHoneyObjectUrl]: basic behavior', () => {
  const createObjectURLMock = vi.fn();
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();

    createObjectURLMock.mockReset();
    revokeObjectURLMock.mockReset();

    createObjectURLMock
      .mockReturnValueOnce('blob:url-1')
      .mockReturnValueOnce('blob:url-2')
      .mockReturnValueOnce('blob:url-3')
      .mockReturnValueOnce('blob:url-4');

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

  it('should return null when object is not provided', () => {
    const { result } = renderHook(() => useHoneyObjectUrl(undefined));

    expect(result.current).toBeNull();
    expect(createObjectURLMock).not.toHaveBeenCalled();
  });

  it('should create object URL on mount when object is provided', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });

    const { result } = renderHook(() => useHoneyObjectUrl(blob));

    expect(result.current).toBe('blob:url-1');

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
  });

  it('should update object URL when object changes', () => {
    const firstBlob = new Blob(['first'], { type: 'text/plain' });
    const secondBlob = new Blob(['second'], { type: 'text/plain' });

    const { result, rerender } = renderHook(({ blob }) => useHoneyObjectUrl(blob), {
      initialProps: {
        blob: firstBlob,
      },
    });

    expect(result.current).toBe('blob:url-1');

    rerender({
      blob: secondBlob,
    });

    expect(result.current).toBe('blob:url-2');

    expect(createObjectURLMock).toHaveBeenCalledTimes(2);
    expect(createObjectURLMock).toHaveBeenNthCalledWith(1, firstBlob);
    expect(createObjectURLMock).toHaveBeenNthCalledWith(2, secondBlob);
  });

  it('should revoke previous object URL when object changes', () => {
    const firstBlob = new Blob(['first'], { type: 'text/plain' });
    const secondBlob = new Blob(['second'], { type: 'text/plain' });

    const { rerender } = renderHook(({ blob }) => useHoneyObjectUrl(blob), {
      initialProps: {
        blob: firstBlob,
      },
    });

    rerender({
      blob: secondBlob,
    });

    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());

    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:url-1');
  });

  it('should revoke current object URL on unmount', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });

    const { unmount } = renderHook(() => useHoneyObjectUrl(blob));

    unmount();

    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());

    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:url-1');
  });

  it('should set object URL to null when object changes to undefined', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });

    const { result, rerender } = renderHook(({ value }) => useHoneyObjectUrl(value), {
      initialProps: {
        value: blob as Blob | undefined,
      },
    });

    expect(result.current).toBe('blob:url-1');

    rerender({
      value: undefined,
    });

    expect(result.current).toBeNull();

    act(() => vi.runAllTimers());

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:url-1');
  });

  it('should work correctly in StrictMode', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );

    const { result } = renderHook(() => useHoneyObjectUrl(blob), { wrapper });

    expect(result.current).toMatch(/^blob:url-/);
    expect(createObjectURLMock).toHaveBeenCalled();
  });
});