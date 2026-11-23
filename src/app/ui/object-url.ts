import { effect, resource, type ResourceRef } from '@angular/core';

/**
 * Bytes that need the bearer, as an address an element can load: an `<img>` or a `<video>` cannot
 * send it. `id` gives undefined while there is nothing to read. The address is let go when another
 * replaces it and when the page leaves.
 */
export function objectUrl(
  id: () => string | undefined,
  read: (id: string) => Promise<Blob>,
): ResourceRef<string | undefined> {
  const url = resource({
    params: id,
    loader: async ({ params, abortSignal }) => {
      const bytes = await read(params);
      abortSignal.throwIfAborted();
      return URL.createObjectURL(bytes);
    },
  });
  effect((onCleanup) => {
    // `value()` throws once the load has failed.
    if (url.hasValue()) {
      const loaded = url.value();
      onCleanup(() => {
        URL.revokeObjectURL(loaded);
      });
    }
  });
  return url;
}
