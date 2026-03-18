import { renderHook } from '@testing-library/react';

import { useHoneyPendingTargets } from '../use-honey-pending-targets';

describe('[useHoneyPendingTargets]: basic behavior', () => {
  it('should set and get a target', () => {
    const { result } = renderHook(() => useHoneyPendingTargets<HTMLElement, 'top'>());

    const el = document.createElement('div');

    result.current.set('top', el);

    expect(result.current.get('top')).toBe(el);
  });

  it('should return null for non-existing key', () => {
    const { result } = renderHook(() => useHoneyPendingTargets<HTMLElement, 'top'>());

    expect(result.current.get('top')).toBeNull();
  });

  it('should correctly report has()', () => {
    const { result } = renderHook(() => useHoneyPendingTargets<HTMLElement, 'top'>());

    const el = document.createElement('div');

    expect(result.current.has('top')).toBe(false);

    result.current.set('top', el);

    expect(result.current.has('top')).toBe(true);

    result.current.set('top', null);

    expect(result.current.has('top')).toBe(false);
  });

  it('should consume a target and clear it', () => {
    const { result } = renderHook(() => useHoneyPendingTargets<HTMLElement, 'top'>());

    const el = document.createElement('div');

    result.current.set('top', el);

    const consumed = result.current.consume('top');

    expect(consumed).toBe(el);
    expect(result.current.get('top')).toBeNull();
    expect(result.current.has('top')).toBe(false);
  });

  it('should return null when consuming non-existing key', () => {
    const { result } = renderHook(() => useHoneyPendingTargets<HTMLElement, 'top'>());

    expect(result.current.consume('top')).toBeNull();
  });

  it('should overwrite existing target', () => {
    const { result } = renderHook(() => useHoneyPendingTargets<HTMLElement, 'top'>());

    const el1 = document.createElement('div');
    const el2 = document.createElement('div');

    result.current.set('top', el1);
    result.current.set('top', el2);

    expect(result.current.get('top')).toBe(el2);
  });

  it('should clear all targets', () => {
    const { result } = renderHook(() => useHoneyPendingTargets<HTMLElement, 'top' | 'bottom'>());

    const topEl = document.createElement('div');
    const bottomEl = document.createElement('div');

    result.current.set('top', topEl);
    result.current.set('bottom', bottomEl);

    result.current.clear();

    expect(result.current.get('top')).toBeNull();
    expect(result.current.get('bottom')).toBeNull();

    expect(result.current.has('top')).toBe(false);
    expect(result.current.has('bottom')).toBe(false);
  });
});