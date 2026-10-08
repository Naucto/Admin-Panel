import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { funnelChart, sparkline, trendChart } from '../../charts/options';
import { type ChartInk, SERIES_COLOURS } from '../../charts/palette';
import { shapeOf, valued } from '../../charts/series-data';
import { AnalyticsApi } from '../../core/analytics.api';
import { longDay, utcDay } from '../../core/dates';
import { FiltersStore } from '../../core/filters.store';
import { formatCount, formatMetric, metricLabel } from '../../core/metric-catalog';
import type { Grain, Tile } from '../../core/types';
import { ChartDirective } from '../../ui/chart.directive';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';
import { StatTileComponent } from '../../ui/stat-tile.component';

const TRAFFIC = ['visitors', 'sessions', 'pageviews', 'plays', 'playtime_ms'] as const;

const TILE_ORDER = [
  'visitors',
  'sessions',
  'plays',
  'playtime_ms',
  'players',
  'active_browsers_peak',
  'pageviews',
  'signups',
  'releases_published',
  'mp_sessions',
];

const PERIOD_NAMES: Record<Grain, { current: string; previous: string }> = {
  DAY: { current: 'Today', previous: 'vs yesterday' },
  WEEK: { current: 'This week', previous: 'vs last week' },
  MONTH: { current: 'This month', previous: 'vs last month' },
};

@Component({
  selector: 'ad-overview-page',
  imports: [
    RouterLink,
    ChartDirective,
    IconComponent,
    PanelComponent,
    SegmentedComponent,
    StatTileComponent,
  ],
  templateUrl: './overview.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OverviewPage {
  private readonly api = inject(AnalyticsApi);
  protected readonly filters = inject(FiltersStore);

  protected readonly tileGrain = signal<Grain>('MONTH');
  protected readonly tileGrains = (['DAY', 'WEEK', 'MONTH'] as const).map((value) => ({
    value,
    label: PERIOD_NAMES[value].current,
  }));
  protected readonly comparedTo = computed(() => PERIOD_NAMES[this.tileGrain()].previous);

  protected readonly overview = resource({
    params: () => ({ grain: this.tileGrain(), day: utcDay() }),
    loader: ({ params }) => this.api.overview(params.grain, params.day),
  });
  protected readonly series = resource({
    params: () => ({ grain: this.filters.grain(), range: this.filters.range() }),
    loader: ({ params }) => this.api.seriesSet(TRAFFIC, params.grain, params.range),
  });
  protected readonly live = resource({ loader: () => this.api.live() });
  protected readonly funnel = resource({
    params: () => this.filters.range(),
    loader: ({ params }) => this.api.funnel(params),
  });
  protected readonly health = resource({ loader: () => this.api.health() });

  protected readonly tiles = computed(() => {
    const tiles = this.overview.value()?.tiles ?? [];
    return TILE_ORDER.map((metric) => tiles.find((tile) => tile.metric === metric)).filter(
      (tile): tile is Tile => tile !== undefined,
    );
  });

  /** A tile's sparkline, when the charts below already hold that metric's periods. */
  protected trendOf(metric: string): number[] {
    const series = this.series.value()?.[metric];
    const values = series ? valued(series.points).map((point) => point.value ?? 0) : [];
    // A line through one or two days of data draws a spike, not a trend.
    return values.filter((value) => value !== 0).length >= 4 ? values : [];
  }

  protected tileLabel(metric: string): string {
    return metricLabel(metric);
  }

  protected tileDisplay(tile: Tile): string {
    return formatMetric(tile.metric, tile.current.value, true);
  }

  protected readonly tilesState = computed(() =>
    panelState(this.overview, (value) => value.tiles.length === 0),
  );

  protected readonly trafficState = computed(() =>
    panelState(this.series, (set) =>
      ['empty', 'zero'].includes(shapeOf([set['visitors'], set['sessions']].filter((s) => !!s))),
    ),
  );
  protected readonly traffic = computed(() => {
    const set = this.series.value();
    const grain = this.filters.grain();
    if (!set?.['visitors'] || !set['sessions'] || !set['pageviews']) {
      return null;
    }
    const lines = [
      { series: set['visitors'], area: true },
      { series: set['sessions'] },
      {
        series: set['pageviews'],
        rightAxis: true,
        kind: 'bar' as const,
        colour: 'rgba(255, 38, 116, 0.55)',
      },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });

  protected readonly playState = computed(() =>
    panelState(this.series, (set) =>
      ['empty', 'zero'].includes(shapeOf([set['plays'], set['playtime_ms']].filter((s) => !!s))),
    ),
  );
  protected readonly play = computed(() => {
    const set = this.series.value();
    if (!set?.['plays'] || !set['playtime_ms']) {
      return null;
    }
    const grain = this.filters.grain();
    const lines = [
      { series: set['plays'], kind: 'bar' as const, colour: SERIES_COLOURS[3] },
      { series: set['playtime_ms'], rightAxis: true, colour: SERIES_COLOURS[0] },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });

  protected readonly onlineNow = computed(() => {
    const current = this.live.value()?.current;
    return current ? current.activeBrowsers + current.anonTabs : null;
  });
  protected readonly liveSpark = computed(() => {
    const samples = this.live.value()?.samples ?? [];
    return sparkline(
      samples.map((sample) => sample.activeBrowsers + sample.anonTabs),
      SERIES_COLOURS[3],
    );
  });

  protected readonly funnelState = computed(() =>
    panelState(this.funnel, (value) => (value.steps[0]?.count ?? 0) === 0),
  );
  protected readonly funnelOption = computed(() => {
    const value = this.funnel.value();
    return value ? (ink: ChartInk) => funnelChart(value, ink) : null;
  });

  protected readonly healthRows = computed(() => {
    const health = this.health.value();
    if (!health) {
      return [];
    }
    return health.finalization.map((row) => ({
      label: row.finalization.toLowerCase(),
      value: row.lastFinalDay ? longDay(row.lastFinalDay) : 'not yet',
    }));
  });
  protected readonly ingest = computed(() => {
    const ingest = this.health.value()?.ingest;
    if (!ingest) {
      return null;
    }
    const received = ingest.accepted + ingest.rejected + ingest.throttled + ingest.writeErrors;
    const failed = ingest.rejected + ingest.throttled + ingest.writeErrors;
    return {
      received: formatCount(received),
      errorRate: received ? `${Math.round((failed / received) * 1000) / 10}%` : '0%',
    };
  });

  protected readonly panelError = panelError;
  protected readonly formatCount = formatCount;
}
