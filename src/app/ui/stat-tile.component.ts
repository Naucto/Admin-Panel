import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { sparkline } from '../charts/options';
import { ChartDirective } from './chart.directive';

/**
 * A headline figure, set like an LCD readout, with how it moved since the period before. A figure
 * with no period before it to compare to says so instead of showing a change from nothing.
 */
@Component({
  selector: 'ad-stat-tile',
  imports: [ChartDirective],
  template: `
    <div class="flex items-start justify-between gap-1">
      <span class="label">{{ label() }}</span>
      @if (provisional()) {
        <span class="ad-chip ad-chip-quiet" title="Still being counted">LIVE</span>
      }
    </div>
    <strong class="ad-readout mt-1 block" [class.text-ink-4]="value() === null">{{
      display()
    }}</strong>
    <div class="mt-0.75 flex min-h-[18px] items-center gap-1 text-meta">
      @if (delta(); as change) {
        <span [class]="change.className">{{ change.text }}</span>
        <span class="text-ink-4">{{ comparedTo() }}</span>
      } @else {
        <span class="text-ink-4">{{
          value() === null
            ? 'No data yet'
            : previous() === 0
              ? 'Nothing the period before'
              : 'First period counted'
        }}</span>
      }
    </div>
    @if (trend().length > 1) {
      <div class="pointer-events-none mt-1 h-[28px]" [adChart]="spark()"></div>
    }
  `,
  host: { class: 'ad-card block px-2 py-1.75' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | null>();
  readonly display = input.required<string>();
  readonly previous = input<number | null>(null);
  readonly provisional = input(false);
  readonly comparedTo = input('vs previous');
  readonly trend = input<number[]>([]);
  readonly colour = input<string>('#ffd100');

  protected readonly delta = computed(() => {
    const value = this.value();
    const previous = this.previous();
    if (value === null || previous === null || previous === 0) {
      return null;
    }
    const percent = Math.round(((value - previous) / previous) * 100);
    if (percent === 0) {
      return { text: '= 0%', className: 'text-ink-3' };
    }
    return percent > 0
      ? { text: `▲ ${percent}%`, className: 'text-jade-ink' }
      : { text: `▼ ${-percent}%`, className: 'text-hot-ink' };
  });

  protected readonly spark = computed(() => sparkline(this.trend(), this.colour()));
}
