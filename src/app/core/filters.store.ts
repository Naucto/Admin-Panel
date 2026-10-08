import { computed, Injectable, signal } from '@angular/core';

import { addDays, daysBetween, grainFor, utcDay } from './dates';
import type { Grain } from './types';

export type RangePreset = '7d' | '30d' | '90d' | '12m';

const PRESET_DAYS: Record<RangePreset, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
];

/** The period every stats page reads, chosen once in the top bar. */
@Injectable({ providedIn: 'root' })
export class FiltersStore {
  readonly preset = signal<RangePreset>('30d');
  /** Null follows the range; a chosen grain stays until the range is changed. */
  readonly grainChoice = signal<Grain | null>(null);

  readonly range = computed(() => {
    const to = utcDay();
    return { from: addDays(to, -(PRESET_DAYS[this.preset()] - 1)), to };
  });
  readonly days = computed(() => daysBetween(this.range().from, this.range().to));
  readonly grain = computed<Grain>(() => this.grainChoice() ?? grainFor(this.days()));

  /** The calendar period a single-period view (a breakdown, the top games) reads. */
  readonly periodGrain = computed<Grain>(() => (this.days() <= 7 ? 'WEEK' : 'MONTH'));

  setPreset(preset: RangePreset): void {
    this.preset.set(preset);
    this.grainChoice.set(null);
  }
}
