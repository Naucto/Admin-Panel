import { Injectable, signal } from '@angular/core';

import type { Marker } from './types';

const HIDDEN_KEY = 'nc-hidden-markers';

function readHidden(): number[] {
  try {
    const stored = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]') as unknown;
    return Array.isArray(stored) ? stored.filter((id): id is number => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

/** Which posts the charts leave out, chosen by each admin in their own browser. */
@Injectable({ providedIn: 'root' })
export class MarkerVisibilityStore {
  readonly hidden = signal<ReadonlySet<number>>(new Set(readHidden()));

  visible(markers: readonly Marker[]): Marker[] {
    const hidden = this.hidden();
    return markers.filter((marker) => !hidden.has(marker.id));
  }

  toggle(id: number): void {
    this.update((hidden) => (hidden.delete(id) ? hidden : hidden.add(id)));
  }

  /** Shows or hides every given post at once, such as all of one channel. */
  setAll(markers: readonly Marker[], shown: boolean): void {
    this.update((hidden) => {
      for (const marker of markers) {
        if (shown) {
          hidden.delete(marker.id);
        } else {
          hidden.add(marker.id);
        }
      }
      return hidden;
    });
  }

  private update(change: (hidden: Set<number>) => Set<number>): void {
    const next = change(new Set(this.hidden()));
    this.hidden.set(next);
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
    } catch {
      // A convenience of this browser; the choice still holds for this visit.
    }
  }
}
