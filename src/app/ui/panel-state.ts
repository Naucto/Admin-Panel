import type { ResourceRef } from '@angular/core';

import { errorMessage } from '../core/api-error';
import type { PanelState } from './panel.component';

/** What a panel shows for a resource: its value once loaded, unless that value has nothing in it. */
export function panelState<T>(
  ref: ResourceRef<T | undefined>,
  isEmpty: (value: T) => boolean,
): PanelState {
  if (ref.error()) {
    return 'error';
  }
  const value = ref.value();
  if (value === undefined) {
    return 'loading';
  }
  return isEmpty(value) ? 'empty' : 'ready';
}

export function panelError<T>(ref: ResourceRef<T | undefined>): string {
  const error = ref.error();
  return error ? errorMessage(error) : '';
}
