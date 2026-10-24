import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { fromUtcInput, spanLabel, toUtcInput } from '../core/instants';
import { INSTANT_PRESETS, type InstantPreset, TimeRangeStore } from '../core/time-range.store';
import { BUCKET_LABELS } from '../core/timeline-catalog';
import type { TimelineBucket } from '../core/types';
import { IconComponent } from './icon.component';

/** The window a timeline page reads: presets ending now, exact UTC instants, and its bucket. */
@Component({
  selector: 'nc-time-range',
  imports: [IconComponent],
  templateUrl: './time-range.component.html',
  host: { class: 'flex flex-wrap items-center gap-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeRangeComponent {
  protected readonly store = inject(TimeRangeStore);
  protected readonly presets = INSTANT_PRESETS;
  protected readonly fromText = signal('');
  protected readonly toText = signal('');
  protected readonly invalid = computed(() => {
    const from = fromUtcInput(this.fromText());
    const to = fromUtcInput(this.toText());
    return from === null || to === null || from >= to;
  });
  protected readonly bucketOptions = computed(() =>
    this.store.buckets().map((bucket) => ({ value: bucket, label: BUCKET_LABELS[bucket] })),
  );
  protected readonly span = computed(() => spanLabel(this.store.spanMs()));

  constructor() {
    effect(() => {
      const { from, to } = this.store.range();
      this.fromText.set(toUtcInput(from));
      this.toText.set(toUtcInput(to));
    });
  }

  protected choosePreset(preset: InstantPreset): void {
    this.store.setPreset(preset);
  }

  protected apply(): void {
    const from = fromUtcInput(this.fromText());
    const to = fromUtcInput(this.toText());
    if (from !== null && to !== null && from < to) {
      this.store.show({ from, to });
    }
  }

  protected chooseBucket(value: string): void {
    this.store.bucketChoice.set(value as TimelineBucket);
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
