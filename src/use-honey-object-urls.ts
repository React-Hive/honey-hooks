import { useEffect, useRef, useState } from 'react';

import { revokeObjectURL } from './utils';

type ObjectUrlSource = Blob | MediaSource;

const EMPTY_OBJECT_URLS: ReadonlyMap<ObjectUrlSource, string> = new Map();

/**
 * Creates and manages object URLs for a list of `Blob` or `MediaSource` objects - the list
 * counterpart of `useHoneyObjectUrl`, for whatever shows several of them at once, such as a
 * gallery of picked files.
 *
 * The hook:
 * - creates an object URL for each object, once, however often the list is rebuilt around it
 * - keeps the URL of an object that stays in the list, so whatever shows it is not reloaded
 * - revokes the URL of an object that leaves the list, asynchronously, to avoid revoking it while
 *   it may still be in use
 * - revokes every URL on unmounting to prevent memory leaks
 *
 * The URLs are created after the render that first lists an object, so an object added to the list
 * has no URL for that one render. The map keeps its identity while the URLs stay the same, so it
 * can be depended on by `useMemo` and `useEffect`.
 *
 * @param objs - Source objects to create object URLs for. An object listed twice gets one URL.
 *
 * @returns Object URLs by the objects they were created for.
 *
 * @example
 * ```tsx
 * const objectUrls = useHoneyObjectUrls(files);
 *
 * return files.map(file => {
 *   const objectUrl = objectUrls.get(file);
 *
 *   return objectUrl ? <img key={objectUrl} src={objectUrl} alt="Preview" /> : null;
 * });
 * ```
 */
export const useHoneyObjectUrls = (
  objs: readonly ObjectUrlSource[],
): ReadonlyMap<ObjectUrlSource, string> => {
  const [objectUrls, setObjectUrls] = useState(EMPTY_OBJECT_URLS);

  /**
   * The URLs not yet revoked, which the effects read and replace - ahead of the state, as two of
   * them can run before the component renders again.
   */
  const objectUrlsRef = useRef(EMPTY_OBJECT_URLS);

  useEffect(() => {
    const prevObjectUrls = objectUrlsRef.current;
    const uniqueObjs = new Set(objs);

    const isUnchanged =
      uniqueObjs.size === prevObjectUrls.size &&
      [...uniqueObjs].every(obj => prevObjectUrls.has(obj));

    if (isUnchanged) {
      return;
    }

    const nextObjectUrls = new Map(
      [...uniqueObjs].map(obj => [obj, prevObjectUrls.get(obj) ?? URL.createObjectURL(obj)]),
    );

    objectUrlsRef.current = nextObjectUrls;

    setObjectUrls(nextObjectUrls);

    prevObjectUrls.forEach((url, obj) => {
      if (!nextObjectUrls.has(obj)) {
        revokeObjectURL(url);
      }
    });
  }, [objs]);

  useEffect(
    () => () => {
      // Not only on unmounting: React StrictMode, and an <Activity> as it hides, run the effects
      // again after this, which recreate what it revokes. Until they do, nothing rendered may be
      // handed a revoked URL - an <Activity> shown again renders before its effects run
      setObjectUrls(EMPTY_OBJECT_URLS);

      const objectUrlsToRevoke = objectUrlsRef.current;
      objectUrlsRef.current = EMPTY_OBJECT_URLS;

      objectUrlsToRevoke.forEach(url => revokeObjectURL(url));
    },
    [],
  );

  return objectUrls;
};
