import { useEffect, useState } from 'react';

import type { Nullable } from './types';
import { useHoneyLatest } from './use-honey-latest';
import { useHoneyOnChange } from './use-honey-on-change';

/**
 * Revokes an object URL asynchronously.
 *
 * Delaying revocation avoids conflicts with cases where the URL
 * may still be used during the current execution frame.
 *
 * @param url - Object URL to revoke.
 */
const revokeObjectURL = (url: Nullable<string>) => {
  if (url) {
    // Revoke the URL asynchronously to avoid conflicts with its usage
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
};

/**
 * Creates and manages an object URL for the provided `Blob` or `MediaSource`.
 *
 * The hook:
 * - creates an object URL for the current object
 * - updates the URL when the object changes
 * - revokes the previous URL asynchronously to avoid revoking it while it may still be in use
 * - revokes the current URL on unmounting to prevent memory leaks
 *
 * This hook returns `null` when no object is provided.
 *
 * @param obj - Source object used to create an object URL.
 *
 * @returns Object URL for the provided object, or `null` when `obj` is not defined.
 *
 * @example
 * ```tsx
 * const objectUrl = useObjectUrl(mediaFileData);
 *
 * return objectUrl ? <img src={objectUrl} alt="Preview" /> : null;
 * ```
 */
export const useHoneyObjectUrl = (
  obj: Nullable<Blob | MediaSource> | undefined,
): Nullable<string> => {
  const [objectUrl, setObjectUrl] = useState<Nullable<string>>(() =>
    obj ? URL.createObjectURL(obj) : null,
  );

  const objectUrlRef = useHoneyLatest(objectUrl);

  useHoneyOnChange(obj, newObj => {
    revokeObjectURL(objectUrlRef.current);

    setObjectUrl(newObj ? URL.createObjectURL(newObj) : null);
  });

  useEffect(() => {
    // Handles React StrictMode where the object URL may be revoked during
    // the development double-invocation cycle and needs to be recreated
    if (!objectUrlRef.current && obj) {
      setObjectUrl(URL.createObjectURL(obj));
    }

    return () => {
      setObjectUrl(null);

      const urlToRevoke = objectUrlRef.current;
      objectUrlRef.current = null;

      revokeObjectURL(urlToRevoke);
    };
  }, []);

  return objectUrl;
};
