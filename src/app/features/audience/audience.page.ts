import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';

import { combine } from '../../charts/derived';
import { retentionChart, trendChart } from '../../charts/options';
import { type ChartInk, SERIES_COLOURS } from '../../charts/palette';
import { shapeOf, total } from '../../charts/series-data';
import { AnalyticsApi } from '../../core/analytics.api';
import { utcDay } from '../../core/dates';
import { FiltersStore } from '../../core/filters.store';
import { DIMENSION_LABELS, formatMetric } from '../../core/metric-catalog';
import type { RetentionKind, Series } from '../../core/types';
import { BreakdownViewComponent } from '../../ui/breakdown-view.component';
import { ChartDirective } from '../../ui/chart.directive';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';

const METRICS = [
  'visitors',
  'visitors_new',
  'visitors_returning',
  'sessions',
  'sessions_bounced',
  'session_seconds_total',
  'session_seconds_median',
] as const;

const DIMENSIONS = [
  'country',
  'device',
  'browser',
  'os',
  'screen',
  'language',
  'referrer',
  'utm_source',
  'utm_campaign',
] as const;
type Dimension = (typeof DIMENSIONS)[number];

const SHARE_DIMENSIONS: readonly Dimension[] = ['device', 'browser', 'os', 'screen'];

@Component({
  selector: 'nc-audience-page',
  imports: [BreakdownViewComponent, ChartDirective, PanelComponent, SegmentedComponent],
  templateUrl: './audience.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AudiencePage {
  private readonly api = inject(AnalyticsApi);
  protected readonly filters = inject(FiltersStore);

  protected readonly series = resource({
    params: () => ({ grain: this.filters.grain(), range: this.filters.range() }),
    loader: ({ params }) => this.api.seriesSet(METRICS, params.grain, params.range),
  });

  protected readonly dimension = signal<Dimension>('country');
  protected readonly dimensions = DIMENSIONS.map((value) => ({
    value,
    label: DIMENSION_LABELS[value] ?? value,
  }));
  protected readonly breakdown = resource({
    params: () => ({
      dimension: this.dimension(),
      grain: this.filters.periodGrain(),
      day: utcDay(),
    }),
    loader: ({ params }) =>
      this.api.breakdown('sessions', params.dimension, params.grain, params.day),
  });
  protected readonly preferDonut = computed(() => SHARE_DIMENSIONS.includes(this.dimension()));
  protected readonly breakdownHint = computed(
    () =>
      `Sessions started ${this.periodName()}, by ${(DIMENSION_LABELS[this.dimension()] ?? this.dimension()).toLowerCase()}`,
  );

  protected readonly pages = resource({
    params: () => ({ grain: this.filters.periodGrain(), day: utcDay() }),
    loader: ({ params }) => this.api.breakdown('pageviews', 'route', params.grain, params.day),
  });

  protected readonly retentionKind = signal<RetentionKind>('VISITOR');
  protected readonly retentionKinds = [
    { value: 'VISITOR' as const, label: 'Browsers' },
    { value: 'ACCOUNT' as const, label: 'Accounts' },
  ];
  protected readonly retention = resource({
    params: () => ({ kind: this.retentionKind(), range: this.filters.range() }),
    loader: ({ params }) => this.api.retention(params.kind, params.range),
  });

  protected readonly periodName = computed(() =>
    this.filters.periodGrain() === 'WEEK' ? 'this week' : 'this month',
  );

  private emptyOf(names: readonly string[]) {
    return (set: Record<string, Series>) =>
      ['empty', 'zero'].includes(
        shapeOf(names.map((name) => set[name]).filter((one): one is Series => !!one)),
      );
  }

  protected readonly visitorsState = computed(() =>
    panelState(this.series, this.emptyOf(['visitors_new', 'visitors_returning'])),
  );
  protected readonly visitors = computed(() => {
    const set = this.series.value();
    const grain = this.filters.grain();
    if (!set?.['visitors_new'] || !set['visitors_returning']) {
      return null;
    }
    const lines = [
      {
        series: set['visitors_new'],
        kind: 'bar' as const,
        stack: 'visitors',
        colour: SERIES_COLOURS[0],
      },
      {
        series: set['visitors_returning'],
        kind: 'bar' as const,
        stack: 'visitors',
        colour: SERIES_COLOURS[1],
      },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });
  protected readonly visitorTotals = computed(() => {
    const set = this.series.value();
    if (!set?.['visitors_new'] || !set['visitors_returning']) {
      return null;
    }
    const fresh = total(set['visitors_new']);
    const returning = total(set['visitors_returning']);
    return {
      fresh: formatMetric('visitors_new', fresh),
      returning: formatMetric('visitors_returning', returning),
      share: fresh + returning > 0 ? Math.round((returning / (fresh + returning)) * 100) : null,
    };
  });

  protected readonly sessionsState = computed(() =>
    panelState(this.series, this.emptyOf(['sessions'])),
  );
  protected readonly sessions = computed(() => {
    const set = this.series.value();
    const grain = this.filters.grain();
    if (!set?.['sessions'] || !set['sessions_bounced']) {
      return null;
    }
    const bounce = combine(
      'bounce_rate',
      set['sessions_bounced'],
      set['sessions'],
      (bounced, all) => Math.round((bounced / all) * 1000) / 10,
    );
    const lines = [
      { series: set['sessions'], kind: 'bar' as const, colour: SERIES_COLOURS[1] },
      { series: bounce, rightAxis: true, colour: SERIES_COLOURS[2] },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });

  protected readonly lengthState = computed(() =>
    panelState(this.series, this.emptyOf(['session_seconds_median', 'session_seconds_total'])),
  );
  protected readonly length = computed(() => {
    const set = this.series.value();
    const grain = this.filters.grain();
    if (!set?.['session_seconds_median'] || !set['session_seconds_total'] || !set['sessions']) {
      return null;
    }
    const mean = combine(
      'session_seconds_mean',
      set['session_seconds_total'],
      set['sessions'],
      (seconds, sessions) => seconds / sessions,
    );
    const lines = [
      { series: set['session_seconds_median'], colour: SERIES_COLOURS[3], area: true },
      { series: mean, colour: SERIES_COLOURS[4] },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });

  protected readonly breakdownState = computed(() =>
    panelState(this.breakdown, (value) => value.values.every((item) => item.value === 0)),
  );
  protected readonly pagesState = computed(() =>
    panelState(this.pages, (value) => value.values.every((item) => item.value === 0)),
  );

  protected readonly retentionState = computed(() =>
    panelState(this.retention, (value) => value.cohorts.every((cohort) => cohort.size === 0)),
  );
  protected readonly retentionOption = computed(() => {
    const value = this.retention.value();
    return value ? (ink: ChartInk) => retentionChart(value, ink) : null;
  });
  protected readonly retentionHeight = computed(() => {
    const rows = this.retention.value()?.cohorts.filter((cohort) => cohort.size > 0).length ?? 0;
    return Math.max(200, Math.min(640, 48 + rows * 30));
  });

  protected readonly panelError = panelError;
}
