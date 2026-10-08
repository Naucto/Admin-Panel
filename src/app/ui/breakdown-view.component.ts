import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { donutChart, rankedBars } from '../charts/options';
import { formatMetric } from '../core/metric-catalog';
import type { Breakdown } from '../core/types';
import { ChartDirective } from './chart.directive';

const DONUT_LIMIT = 6;
const BAR_LIMIT = 12;

/** The backend's placeholders for an unknown value and for the folded rest. */
const KEY_LABELS: Record<string, string> = { '(none)': 'Unknown', '(other)': 'Other' };

/**
 * One period of a metric split by a dimension. A single value is stated, a handful of shares of a
 * whole make a donut, and anything longer becomes ranked bars, which compare without a legend.
 */
@Component({
  selector: 'ad-breakdown-view',
  imports: [ChartDirective],
  template: `
    @if (items().length === 1) {
      <div class="flex h-full flex-col items-center justify-center gap-0.5 text-center">
        <p class="ad-readout">{{ single() }}</p>
        <p class="text-body text-ink-body">all from {{ items()[0]?.label }}</p>
        <p class="text-meta text-ink-3">A second value shows up here as soon as one is counted.</p>
      </div>
    } @else {
      <div class="h-full" [adChart]="option()"></div>
    }
    @if (breakdown().truncated) {
      <p class="mt-0.5 text-meta text-ink-4">The rarest values are folded into (other).</p>
    }
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakdownViewComponent {
  readonly breakdown = input.required<Breakdown>();
  /** Shares of a whole that read well as a donut, like devices. */
  readonly preferDonut = input(false);
  readonly colour = input<string | undefined>(undefined);

  protected readonly items = computed(() =>
    this.breakdown()
      .values.filter((value) => value.value > 0)
      .map((value) => ({ label: KEY_LABELS[value.key] ?? value.key, value: value.value })),
  );

  protected readonly single = computed(() =>
    formatMetric(this.breakdown().metric, this.items()[0]?.value ?? 0),
  );

  protected readonly option = computed(() => {
    const items = this.items();
    const metric = this.breakdown().metric;
    if (this.preferDonut() && items.length <= DONUT_LIMIT) {
      return donutChart(items, metric);
    }
    return rankedBars(items.slice(0, BAR_LIMIT), metric, this.colour());
  });
}
