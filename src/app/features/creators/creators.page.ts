import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';

import { trendChart } from '../../charts/options';
import { type ChartInk, SERIES_COLOURS } from '../../charts/palette';
import { shapeOf, total } from '../../charts/series-data';
import { AnalyticsApi } from '../../core/analytics.api';
import { FiltersStore } from '../../core/filters.store';
import { formatMetric, metricLabel } from '../../core/metric-catalog';
import type { Series } from '../../core/types';
import { ChartDirective } from '../../ui/chart.directive';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';

const METRICS = [
  'signups',
  'accounts_active',
  'builders_active',
  'build_minutes',
  'projects_created',
  'releases_published',
  'releases_updated',
  'releases_unpublished',
] as const;

/** Totals over the range, for the metrics that add up. */
const TOTALS = [
  'signups',
  'projects_created',
  'releases_published',
  'releases_updated',
  'build_minutes',
];

@Component({
  selector: 'nc-creators-page',
  imports: [ChartDirective, PanelComponent],
  templateUrl: './creators.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CreatorsPage {
  private readonly api = inject(AnalyticsApi);
  protected readonly filters = inject(FiltersStore);

  protected readonly series = resource({
    params: () => ({ grain: this.filters.grain(), range: this.filters.range() }),
    loader: ({ params }) => this.api.seriesSet(METRICS, params.grain, params.range),
  });

  protected readonly totals = computed(() => {
    const set = this.series.value();
    return set
      ? TOTALS.filter((metric) => set[metric]).map((metric) => ({
          metric,
          label: metricLabel(metric),
          value: formatMetric(metric, total(set[metric] as Series), true),
        }))
      : [];
  });

  private emptyOf(names: readonly string[]) {
    return (set: Record<string, Series>) =>
      ['empty', 'zero'].includes(
        shapeOf(names.map((name) => set[name]).filter((one): one is Series => !!one)),
      );
  }

  private chart(
    lines: {
      metric: string;
      kind?: 'bar' | 'line';
      colour: string;
      right?: boolean;
      area?: boolean;
    }[],
  ) {
    const set = this.series.value();
    const grain = this.filters.grain();
    if (!set || lines.some((line) => !set[line.metric])) {
      return null;
    }
    const trend = lines.map((line) => ({
      series: set[line.metric] as Series,
      kind: line.kind,
      colour: line.colour,
      rightAxis: line.right,
      area: line.area,
    }));
    return (ink: ChartInk) => trendChart(trend, grain, ink);
  }

  protected readonly accountsState = computed(() =>
    panelState(this.series, this.emptyOf(['signups', 'accounts_active'])),
  );
  protected readonly accounts = computed(() =>
    this.chart([
      { metric: 'signups', kind: 'bar', colour: SERIES_COLOURS[0] },
      { metric: 'accounts_active', colour: SERIES_COLOURS[1], right: true },
    ]),
  );

  protected readonly buildingState = computed(() =>
    panelState(this.series, this.emptyOf(['builders_active', 'build_minutes'])),
  );
  protected readonly building = computed(() =>
    this.chart([
      { metric: 'build_minutes', colour: SERIES_COLOURS[1], area: true },
      { metric: 'builders_active', kind: 'bar', colour: SERIES_COLOURS[4], right: true },
    ]),
  );

  protected readonly releasesState = computed(() =>
    panelState(
      this.series,
      this.emptyOf([
        'projects_created',
        'releases_published',
        'releases_updated',
        'releases_unpublished',
      ]),
    ),
  );
  protected readonly releases = computed(() =>
    this.chart([
      { metric: 'projects_created', kind: 'bar', colour: SERIES_COLOURS[1] },
      { metric: 'releases_published', kind: 'bar', colour: SERIES_COLOURS[3] },
      { metric: 'releases_updated', kind: 'bar', colour: SERIES_COLOURS[0] },
      { metric: 'releases_unpublished', kind: 'bar', colour: SERIES_COLOURS[2] },
    ]),
  );

  protected readonly panelError = panelError;
}
