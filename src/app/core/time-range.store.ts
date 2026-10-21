import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import { DAY_MS, HOUR_MS, MINUTE_MS } from './instants';
import type { InstantRange } from './timeline.api';
import { BUCKET_MS, bucketFor, bucketsFor } from './timeline-catalog';
import type { TimelineBucket } from './types';

export type InstantPreset = '1h' | '6h' | '24h' | '48h' | '7d' | '30d' | '90d';

export const INSTANT_PRESETS: { value: InstantPreset; label: string; spanMs: number }[] = [
  { value: '1h', label: '1 h', spanMs: HOUR_MS },
  { value: '6h', label: '6 h', spanMs: 6 * HOUR_MS },
  { value: '24h', label: '24 h', spanMs: DAY_MS },
  { value: '48h', label: '48 h', spanMs: 2 * DAY_MS },
  { value: '7d', label: '7 d', spanMs: 7 * DAY_MS },
  { value: '30d', label: '30 d', spanMs: 30 * DAY_MS },
  { value: '90d', label: '90 d', spanMs: 90 * DAY_MS },
];

/** Raw data is kept 90 days; a window never starts earlier. */
export const RAW_WINDOW_MS = 90 * DAY_MS;
const LIVE_TICK_MS = MINUTE_MS;
const SHORTEST_MS = 10 * MINUTE_MS;

/**
 * The stretch of time the timeline pages read, down to the minute: a preset ending now that
 * follows the clock, or a fixed window chosen by hand or by dragging across a chart. Zooming keeps
 * the windows it left, so the reader can step back out.
 */
@Injectable({ providedIn: 'root' })
export class TimeRangeStore {
  readonly preset = signal<InstantPreset | null>('24h');
  readonly custom = signal<InstantRange | null>(null);
  /** Null picks the finest readable bucket for the window. */
  readonly bucketChoice = signal<TimelineBucket | null>(null);
  readonly history = signal<InstantRange[]>([]);
  private readonly now = signal(Date.now());

  constructor() {
    const timer = setInterval(() => {
      if (this.preset() !== null) {
        this.now.set(Date.now());
      }
    }, LIVE_TICK_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
    });
  }

  readonly range = computed<InstantRange>(() => {
    const preset = INSTANT_PRESETS.find((one) => one.value === this.preset());
    if (preset) {
      const to = Math.ceil(this.now() / MINUTE_MS) * MINUTE_MS;
      return { from: to - preset.spanMs, to };
    }
    return this.custom() ?? { from: this.now() - DAY_MS, to: this.now() };
  });
  readonly spanMs = computed(() => this.range().to - this.range().from);
  readonly following = computed(() => this.preset() !== null);
  readonly buckets = computed(() => bucketsFor(this.spanMs()));
  readonly bucket = computed<TimelineBucket>(() => {
    const chosen = this.bucketChoice();
    return chosen && this.buckets().includes(chosen) ? chosen : bucketFor(this.spanMs());
  });
  readonly bucketMs = computed(() => BUCKET_MS[this.bucket()]);

  setPreset(preset: InstantPreset): void {
    this.history.set([]);
    this.bucketChoice.set(null);
    this.now.set(Date.now());
    this.preset.set(preset);
  }

  /** Shows a fixed window, keeping the current one to step back to. */
  zoomTo(range: InstantRange): void {
    const fitted = this.fit(range);
    this.history.update((windows) => [...windows, this.range()].slice(-20));
    this.bucketChoice.set(null);
    this.custom.set(fitted);
    this.preset.set(null);
  }

  /** Shows a fixed window from scratch, as a link or the date fields ask for. */
  show(range: InstantRange): void {
    this.history.set([]);
    this.bucketChoice.set(null);
    this.custom.set(this.fit(range));
    this.preset.set(null);
  }

  back(): void {
    const previous = this.history().at(-1);
    if (!previous) {
      return;
    }
    this.history.update((windows) => windows.slice(0, -1));
    this.bucketChoice.set(null);
    this.custom.set(previous);
    this.preset.set(null);
  }

  /** Twice as long around the same middle. */
  zoomOut(): void {
    const { from, to } = this.range();
    const half = to - from;
    this.zoomTo({ from: from - half / 2, to: to + half / 2 });
  }

  /** Moves the window by a share of its length, earlier or later. */
  pan(share: number): void {
    const { from, to } = this.range();
    const shift = (to - from) * share;
    this.show({ from: from + shift, to: to + shift });
  }

  refresh(): void {
    this.now.set(Date.now());
  }

  /** Inside the raw window and not past now, and never shorter than a few minutes. */
  private fit(range: InstantRange): InstantRange {
    const now = Date.now();
    let to = Math.min(Math.max(range.to, range.from + SHORTEST_MS), now + HOUR_MS);
    let from = Math.max(range.from, now - RAW_WINDOW_MS);
    if (to - from < SHORTEST_MS) {
      from = to - SHORTEST_MS;
    }
    to = Math.round(to / MINUTE_MS) * MINUTE_MS;
    from = Math.round(from / MINUTE_MS) * MINUTE_MS;
    return { from, to };
  }
}
