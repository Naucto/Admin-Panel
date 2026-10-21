import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';

import { SERIES_COLOURS } from '../../charts/palette';
import type { ChartInk } from '../../charts/palette';
import { type CompareMode, compareChart, type DrawnSeries } from '../../charts/timeline-options';
import { instantLabel } from '../../core/instants';
import { formatCount } from '../../core/metric-catalog';
import { TimeRangeStore } from '../../core/time-range.store';
import { TimelineApi } from '../../core/timeline.api';
import { TIMELINE_LABELS, TIMELINE_METRIC_NAMES } from '../../core/timeline-catalog';
import { MarkerVisibilityStore } from '../../core/marker-visibility.store';
import type { GameChoice, Timeline, TimelineMetric } from '../../core/types';
import { ChartDirective } from '../../ui/chart.directive';
import { GamePickerComponent } from '../../ui/game-picker.component';
import { IconComponent } from '../../ui/icon.component';
import { MarkerFilterComponent } from '../../ui/marker-filter.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';
import { TimeRangeComponent } from '../../ui/time-range.component';

const VIEWS_KEY = 'nc-compare-views';
const CURRENT_KEY = 'nc-compare-current';
export const MAX_SERIES = SERIES_COLOURS.length;

export interface CompareSeries {
  id: number;
  metric: TimelineMetric;
  releaseId: number | null;
  /** The game's name when it was chosen, so a saved chart needs no lookup to label it. */
  gameName?: string;
  source: string | null;
  colour: string;
}

export interface CompareView {
  name: string;
  series: CompareSeries[];
  mode: CompareMode;
  kind: 'line' | 'bar';
}

const DEFAULT_VIEW: CompareView = {
  name: '',
  mode: 'counts',
  kind: 'line',
  series: [
    { id: 1, metric: 'visitors_new', releaseId: null, source: null, colour: SERIES_COLOURS[0] },
    { id: 2, metric: 'plays_consented', releaseId: null, source: null, colour: SERIES_COLOURS[1] },
    { id: 3, metric: 'plays_anonymous', releaseId: null, source: null, colour: SERIES_COLOURS[2] },
  ],
};

function isView(value: unknown): value is CompareView {
  const view = value as Partial<CompareView> | null;
  return (
    typeof view?.name === 'string' &&
    Array.isArray(view.series) &&
    view.series.every((series) => TIMELINE_METRIC_NAMES.includes(series.metric))
  );
}

function read<T>(key: string, check: (value: unknown) => value is T): T | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as unknown;
    return check(value) ? value : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Views are a convenience of this browser; the chart works without them.
  }
}

/** Groups series by what they are narrowed to, so each group is one request. */
export function requestGroups(
  series: readonly CompareSeries[],
): { releaseId: number | null; source: string | null; metrics: TimelineMetric[] }[] {
  const groups = new Map<
    string,
    { releaseId: number | null; source: string | null; metrics: TimelineMetric[] }
  >();
  for (const one of series) {
    const key = `${String(one.releaseId)}|${one.source ?? ''}`;
    const group = groups.get(key) ?? { releaseId: one.releaseId, source: one.source, metrics: [] };
    if (!group.metrics.includes(one.metric)) {
      group.metrics.push(one.metric);
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}

@Component({
  selector: 'nc-compare-page',
  imports: [
    ChartDirective,
    GamePickerComponent,
    IconComponent,
    MarkerFilterComponent,
    PanelComponent,
    SegmentedComponent,
    TimeRangeComponent,
  ],
  templateUrl: './compare.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ComparePage {
  private readonly api = inject(TimelineApi);
  protected readonly range = inject(TimeRangeStore);

  protected readonly metricOptions = TIMELINE_METRIC_NAMES.map((metric) => ({
    value: metric,
    ...TIMELINE_LABELS[metric],
  }));
  protected readonly modes = [
    { value: 'counts' as const, label: 'Counts' },
    { value: 'peak' as const, label: 'Share of own peak' },
  ];
  protected readonly kinds = [
    { value: 'line' as const, label: 'Lines' },
    { value: 'bar' as const, label: 'Bars' },
  ];
  protected readonly maxSeries = MAX_SERIES;

  private readonly start = read(CURRENT_KEY, isView) ?? DEFAULT_VIEW;
  protected readonly series = signal<CompareSeries[]>(this.start.series);
  protected readonly mode = signal<CompareMode>(this.start.mode);
  protected readonly kind = signal<'line' | 'bar'>(this.start.kind);
  private readonly visibility = inject(MarkerVisibilityStore);
  protected readonly views = signal<CompareView[]>(
    read(
      VIEWS_KEY,
      (value): value is CompareView[] => Array.isArray(value) && value.every(isView),
    ) ?? [],
  );
  protected readonly viewName = signal('');

  constructor() {
    effect(() => {
      write(CURRENT_KEY, { name: '', series: this.series(), mode: this.mode(), kind: this.kind() });
    });
  }

  protected readonly sources = resource({
    params: () => this.range.range(),
    loader: ({ params }) => this.api.sources(params),
  });
  protected readonly markers = resource({
    params: () => this.range.range(),
    loader: ({ params }) => this.api.markers(params),
  });

  protected readonly data = resource({
    params: () => ({
      range: this.range.range(),
      bucket: this.range.bucket(),
      groups: requestGroups(this.series()),
    }),
    loader: async ({ params }) => {
      const answers = await Promise.all(
        params.groups.map((group) =>
          this.api.timeline(params.range, params.bucket, group.metrics, {
            releaseId: group.releaseId,
            source: group.source,
          }),
        ),
      );
      return params.groups.map((group, index) => ({ group, timeline: answers[index]! }));
    },
  });
  protected readonly state = computed(() =>
    this.series().length === 0 ? 'empty' : panelState(this.data, () => false),
  );

  protected readonly drawn = computed(() => {
    const answers = this.data.value();
    if (!answers) {
      return null;
    }
    const first: Timeline | undefined = answers[0]?.timeline;
    if (!first) {
      return null;
    }
    const lines: (DrawnSeries & { total: number | null })[] = this.series().map((one) => {
      const answer = answers.find(
        (candidate) =>
          candidate.group.releaseId === one.releaseId && candidate.group.source === one.source,
      );
      const series = answer?.timeline.series.find((candidate) => candidate.metric === one.metric);
      return {
        name: this.nameOf(one),
        colour: one.colour,
        values: series?.values ?? [],
        total: series?.total ?? null,
      };
    });
    return { timeline: first, lines };
  });
  protected readonly chart = computed(() => {
    const drawn = this.drawn();
    if (!drawn) {
      return null;
    }
    const mode = this.mode();
    const kind = this.kind();
    const markers = this.visibility.visible(this.markers.value() ?? []);
    return (ink: ChartInk) => compareChart(drawn.timeline, drawn.lines, mode, kind, markers, ink);
  });
  protected readonly table = computed(() => {
    const drawn = this.drawn();
    if (!drawn) {
      return null;
    }
    return {
      columns: drawn.lines.map((line) => ({ name: line.name, colour: line.colour })),
      rows: drawn.timeline.buckets.map((at, index) => ({
        at: instantLabel(at),
        values: drawn.lines.map((line) => line.values[index] ?? null),
      })),
      totals: drawn.lines.map((line) => line.total),
    };
  });

  protected nameOf(one: CompareSeries): string {
    const parts = [TIMELINE_LABELS[one.metric].label];
    if (one.releaseId !== null && TIMELINE_LABELS[one.metric].byGame) {
      parts.push(one.gameName ?? `game #${String(one.releaseId)}`);
    }
    if (one.source !== null && TIMELINE_LABELS[one.metric].bySource) {
      parts.push(this.sourceName(one.source));
    }
    return parts.join(' · ');
  }

  protected labelOf(metric: TimelineMetric): (typeof TIMELINE_LABELS)[TimelineMetric] {
    return TIMELINE_LABELS[metric];
  }

  protected add(): void {
    const used = new Set(this.series().map((one) => one.colour));
    const colour = SERIES_COLOURS.find((candidate) => !used.has(candidate));
    if (!colour) {
      return;
    }
    const id = Math.max(0, ...this.series().map((one) => one.id)) + 1;
    this.series.update((series) => [
      ...series,
      { id, metric: 'visitors_new', releaseId: null, source: null, colour },
    ]);
  }

  protected removeSeries(id: number): void {
    this.series.update((series) => series.filter((one) => one.id !== id));
  }

  protected gameOf(one: CompareSeries): GameChoice | null {
    return one.releaseId === null
      ? null
      : { releaseId: one.releaseId, name: one.gameName ?? `#${String(one.releaseId)}` };
  }

  protected setGame(id: number, game: GameChoice | null): void {
    this.series.update((series) =>
      series.map((one) =>
        one.id === id
          ? { ...one, releaseId: game?.releaseId ?? null, gameName: game?.name ?? undefined }
          : one,
      ),
    );
  }

  protected change(id: number, field: 'metric' | 'source', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.series.update((series) =>
      series.map((one) => {
        if (one.id !== id) {
          return one;
        }
        if (field === 'metric') {
          const metric = value as TimelineMetric;
          return {
            ...one,
            metric,
            releaseId: TIMELINE_LABELS[metric].byGame ? one.releaseId : null,
            source: TIMELINE_LABELS[metric].bySource ? one.source : null,
          };
        }
        return { ...one, source: value === '' ? null : value };
      }),
    );
  }

  protected saveView(): void {
    const name = this.viewName().trim();
    if (name === '') {
      return;
    }
    const view: CompareView = { name, series: this.series(), mode: this.mode(), kind: this.kind() };
    this.views.update((views) => [...views.filter((one) => one.name !== name), view]);
    write(VIEWS_KEY, this.views());
    this.viewName.set('');
  }

  protected loadView(view: CompareView): void {
    this.series.set(view.series);
    this.mode.set(view.mode);
    this.kind.set(view.kind);
  }

  protected deleteView(name: string): void {
    this.views.update((views) => views.filter((one) => one.name !== name));
    write(VIEWS_KEY, this.views());
  }

  protected sourceName(source: string): string {
    const [kind, ...rest] = source.split(':');
    const value = rest.join(':');
    if (kind === 'referrer') {
      return value === '(none)' ? 'Direct' : value;
    }
    return kind === 'utmCampaign' ? `campaign ${value}` : `utm ${value}`;
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected readonly formatCount = formatCount;
  protected readonly panelError = panelError;
}
