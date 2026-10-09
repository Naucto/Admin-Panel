import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';

import { trendChart } from '../../charts/options';
import { type ChartInk, SERIES_COLOURS } from '../../charts/palette';
import { shapeOf, total, valued } from '../../charts/series-data';
import { AnalyticsApi } from '../../core/analytics.api';
import { addDays, daysBetween, periodLabel, utcDay } from '../../core/dates';
import { FiltersStore } from '../../core/filters.store';
import {
  DIMENSION_LABELS,
  formatMetric,
  METRIC_LABELS,
  metricLabel,
} from '../../core/metric-catalog';
import type { MetricInfo, Series } from '../../core/types';
import { BreakdownViewComponent } from '../../ui/breakdown-view.component';
import { ChartDirective } from '../../ui/chart.directive';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';

const POPULATIONS: Record<MetricInfo['population'], string> = {
  C: 'Browsers that accepted analytics',
  C_LINKED: 'Accepting browsers linked to an account',
  A: 'Tabs that declined, counted without any identifier',
  C_AND_A: 'Everyone: accepting browsers and anonymous tabs',
  F: 'Every account, from what happened on the server',
  PRESENCE: 'Who was online, sampled each minute',
};

const KINDS: Record<MetricInfo['kind'], string> = {
  additive: 'Adds up across periods',
  max: 'The highest value of the period',
  perGrain: 'Counted once per period, so periods do not add up',
};

/** Shift a series onto the periods of another, for a period-over-period overlay. */
function alignTo(previous: Series, current: Series): Series {
  return {
    ...previous,
    points: current.points.map((point, index) => ({
      ...point,
      value: previous.points[index]?.value ?? null,
      status: previous.points[index]?.status ?? 'unavailable',
    })),
  };
}

@Component({
  selector: 'nc-explorer-page',
  imports: [BreakdownViewComponent, ChartDirective, PanelComponent, SegmentedComponent],
  templateUrl: './explorer.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ExplorerPage {
  private readonly api = inject(AnalyticsApi);
  protected readonly filters = inject(FiltersStore);

  protected readonly registry = resource({ loader: () => this.api.metrics() });
  protected readonly metric = signal('visitors');
  protected readonly chartKind = signal<'line' | 'bar'>('line');
  protected readonly kinds = [
    { value: 'line' as const, label: 'Line' },
    { value: 'bar' as const, label: 'Bars' },
  ];
  protected readonly compare = signal(false);
  protected readonly dimension = signal<string>('');

  protected readonly groups = computed(() => {
    const metrics = this.registry.value()?.metrics ?? [];
    const byGroup = new Map<string, { name: string; label: string }[]>();
    for (const metric of metrics) {
      const group = METRIC_LABELS[metric.name]?.group ?? 'Other';
      byGroup.set(group, [
        ...(byGroup.get(group) ?? []),
        { name: metric.name, label: metricLabel(metric.name) },
      ]);
    }
    return [...byGroup.entries()].map(([group, items]) => ({ group, items }));
  });
  protected readonly info = computed(() =>
    this.registry.value()?.metrics.find((metric) => metric.name === this.metric()),
  );
  protected readonly dimensions = computed(() =>
    (this.info()?.dimensions ?? []).map((value) => ({
      value,
      label: DIMENSION_LABELS[value] ?? value,
    })),
  );

  protected readonly series = resource({
    params: () => ({
      metric: this.metric(),
      grain: this.filters.grain(),
      range: this.filters.range(),
      compare: this.compare(),
    }),
    loader: async ({ params }) => {
      const current = await this.api.series(params.metric, params.grain, params.range);
      if (!params.compare) {
        return { current, previous: null };
      }
      const days = daysBetween(params.range.from, params.range.to);
      const previous = await this.api.series(params.metric, params.grain, {
        from: addDays(params.range.from, -days),
        to: addDays(params.range.from, -1),
      });
      return { current, previous: alignTo(previous, current) };
    },
  });

  protected readonly breakdown = resource({
    params: () =>
      this.dimension()
        ? {
            metric: this.metric(),
            dimension: this.dimension(),
            grain: this.filters.periodGrain(),
            day: utcDay(),
          }
        : undefined,
    loader: ({ params }) =>
      this.api.breakdown(params.metric, params.dimension, params.grain, params.day),
  });

  protected readonly seriesState = computed(() =>
    panelState(this.series, (value) => ['empty', 'zero'].includes(shapeOf([value.current]))),
  );
  protected readonly option = computed(() => {
    const value = this.series.value();
    const grain = this.filters.grain();
    const kind = this.chartKind();
    if (!value) {
      return null;
    }
    const lines = [
      { series: value.current, kind, colour: SERIES_COLOURS[0], area: kind === 'line' },
      ...(value.previous
        ? [
            {
              series: value.previous,
              name: 'Period before',
              kind,
              colour: 'rgba(104, 174, 212, 0.6)',
            },
          ]
        : []),
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });

  protected readonly summary = computed(() => {
    const value = this.series.value();
    const info = this.info();
    if (!value || !info) {
      return null;
    }
    const points = valued(value.current.points);
    const values = points.map((point) => point.value ?? 0);
    const best = points.reduce<(typeof points)[number] | undefined>(
      (top, point) => ((point.value ?? 0) > (top?.value ?? -Infinity) ? point : top),
      undefined,
    );
    const sum = total(value.current);
    const previousSum = value.previous ? total(value.previous) : null;
    return {
      total: info.kind === 'additive' ? formatMetric(info.name, sum) : null,
      average: values.length ? formatMetric(info.name, sum / values.length) : '--',
      peak: best ? formatMetric(info.name, best.value) : '--',
      peakAt: best ? periodLabel(best.periodStart, value.current.grain) : '',
      change:
        previousSum !== null && previousSum > 0 && info.kind === 'additive'
          ? Math.round(((sum - previousSum) / previousSum) * 100)
          : null,
      periods: `${points.length} of ${value.current.points.length}`,
    };
  });

  protected readonly rows = computed(() => {
    const value = this.series.value();
    if (!value) {
      return [];
    }
    return [...value.current.points].reverse().map((point) => ({
      period: periodLabel(point.periodStart, value.current.grain),
      value: formatMetric(this.metric(), point.value),
      status: point.status,
    }));
  });

  protected readonly breakdownState = computed(() =>
    panelState(this.breakdown, (value) => value.values.every((item) => item.value === 0)),
  );

  protected selectMetric(name: string): void {
    this.metric.set(name);
    this.dimension.set('');
  }

  protected readonly population = (info: MetricInfo): string => POPULATIONS[info.population];
  protected readonly kindText = (info: MetricInfo): string => KINDS[info.kind];
  protected readonly metricLabel = metricLabel;
  protected readonly panelError = panelError;
}
