import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsType } from 'echarts/core';

import type { ChartInk } from '../../charts/palette';
import { rowSeries, timelineChart, timelineHeight } from '../../charts/timeline-options';
import { instantLabel, spanLabel, WEEK_MS } from '../../core/instants';
import { formatCount } from '../../core/metric-catalog';
import { TimeRangeStore } from '../../core/time-range.store';
import { type InstantRange, TimelineApi } from '../../core/timeline.api';
import {
  BUCKET_MS,
  BUCKETS,
  CONSENT_COLOURS,
  DEFAULT_ROWS,
  MAX_BUCKETS,
  metricsOfRows,
  TIMELINE_LABELS,
  TIMELINE_METRIC_NAMES,
  TIMELINE_ROWS,
} from '../../core/timeline-catalog';
import { MarkerVisibilityStore } from '../../core/marker-visibility.store';
import type {
  ActivityItem,
  ActivityKind,
  GameChoice,
  Timeline,
  TimelineMetric,
} from '../../core/types';
import { ChartDirective, type ChartEvents } from '../../ui/chart.directive';
import { GamePickerComponent } from '../../ui/game-picker.component';
import { IconComponent } from '../../ui/icon.component';
import type { IconName } from '../../ui/icon-paths';
import { MarkerFilterComponent } from '../../ui/marker-filter.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';
import { TimeRangeComponent } from '../../ui/time-range.component';

const ROWS_KEY = 'nc-timeline-rows';

interface BrushParams {
  areas?: { coordRange?: [number, number] }[];
}

export interface SummaryRow {
  metric: TimelineMetric;
  label: string;
  who: string;
  colour: string;
  combine: 'sum' | 'distinct' | 'max';
  current: number | null;
  previous: number | null;
  lastWeek: number | null;
}

const KIND_LABELS: Record<ActivityKind, { label: string; icon: IconName; tone: string }> = {
  FIRST_VISIT: { label: 'First visit', icon: 'login', tone: 'text-gold-ink' },
  FIRST_PLAY: { label: 'First play', icon: 'play', tone: 'text-jade-ink' },
  SIGNUP: { label: 'Account created', icon: 'user', tone: 'text-sky-ink' },
  PROJECT_CREATED: { label: 'Project created', icon: 'file-plus', tone: 'text-jade-ink' },
  RELEASE_PUBLISHED: { label: 'Game published', icon: 'upload', tone: 'text-hot-ink' },
  RELEASE_UNPUBLISHED: { label: 'Game unpublished', icon: 'archive', tone: 'text-ink-3' },
  MP_SESSION: { label: 'Multiplayer session', icon: 'group', tone: 'text-orange-ink' },
  ANONYMOUS_PLAYS: { label: 'Anonymous plays', icon: 'eye-closed', tone: 'text-hot-ink' },
};

const ANSWER_LABELS: Record<'DECLINED' | 'UNANSWERED' | 'UNKNOWN', string> = {
  DECLINED: 'declined',
  UNANSWERED: 'not answered',
  UNKNOWN: 'answer not sent',
};

function readRows(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(ROWS_KEY) ?? 'null') as unknown;
    if (Array.isArray(stored) && stored.every((key) => typeof key === 'string')) {
      return stored.filter((key: string) => TIMELINE_ROWS.some((row) => row.key === key));
    }
  } catch {
    // Storage may be unavailable; the default rows stand.
  }
  return DEFAULT_ROWS;
}

/** The finest bucket the backend takes for a window, so its totals cover the window closely. */
function summaryBucket(spanMs: number): Timeline['bucket'] {
  return BUCKETS.find((bucket) => spanMs / BUCKET_MS[bucket] <= MAX_BUCKETS) ?? '1d';
}

const totalOf = (timeline: Timeline | undefined, metric: TimelineMetric): number | null =>
  timeline?.series.find((series) => series.metric === metric)?.total ?? null;

@Component({
  selector: 'nc-timeline-page',
  imports: [
    ChartDirective,
    GamePickerComponent,
    IconComponent,
    MarkerFilterComponent,
    PanelComponent,
    RouterLink,
    SegmentedComponent,
    TimeRangeComponent,
  ],
  templateUrl: './timeline.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TimelinePage {
  private readonly api = inject(TimelineApi);
  protected readonly range = inject(TimeRangeStore);

  /** From a link such as a post's: `?from=…&to=…` as ISO instants. */
  readonly from = input<string>();
  readonly to = input<string>();
  readonly gameId = input<string>(undefined, { alias: 'game' });

  protected readonly game = signal<GameChoice | null>(null);
  protected readonly releaseId = computed(() => this.game()?.releaseId ?? null);
  protected readonly source = signal<string | null>(null);
  private readonly visibility = inject(MarkerVisibilityStore);
  protected readonly view = signal<'chart' | 'table'>('chart');
  protected readonly views = [
    { value: 'chart' as const, label: 'Chart' },
    { value: 'table' as const, label: 'Table' },
  ];
  protected readonly rowKeys = signal<string[]>(readRows());
  protected readonly allRows = TIMELINE_ROWS;
  protected readonly rows = computed(() =>
    TIMELINE_ROWS.filter((row) => this.rowKeys().includes(row.key)),
  );
  /** The stretch dragged across the chart, if any. */
  protected readonly selection = signal<InstantRange | null>(null);
  protected readonly focus = computed(() => this.selection() ?? this.range.range());
  /** Kinds of activity left out of the feed; every kind shows at first. */
  protected readonly hiddenKinds = signal<ReadonlySet<ActivityKind>>(new Set());
  protected readonly journeyFilter = signal<string | null>(null);

  constructor() {
    effect(() => {
      const from = Date.parse(this.from() ?? '');
      const to = Date.parse(this.to() ?? '');
      const game = Number(this.gameId());
      untracked(() => {
        if (!Number.isNaN(from) && !Number.isNaN(to) && from < to) {
          this.range.show({ from, to });
        }
        if (Number.isInteger(game) && game > 0) {
          this.game.set({ releaseId: game, name: `#${String(game)}` });
          void this.api.releasesByIds([game]).then(([release]) => {
            if (release && this.game()?.releaseId === game) {
              this.game.set({ releaseId: game, name: release.name });
            }
          });
        }
      });
    });
    effect(() => {
      const keys = this.rowKeys();
      try {
        localStorage.setItem(ROWS_KEY, JSON.stringify(keys));
      } catch {
        // A convenience only; the rows still change for this visit.
      }
    });
    effect(() => {
      this.range.range();
      untracked(() => {
        this.selection.set(null);
      });
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

  protected readonly timeline = resource({
    params: () => ({
      range: this.range.range(),
      bucket: this.range.bucket(),
      metrics: metricsOfRows(this.rows()),
      filters: { releaseId: this.releaseId(), source: this.source() },
    }),
    loader: ({ params }) =>
      this.api.timeline(params.range, params.bucket, params.metrics, params.filters),
  });

  protected readonly chartState = computed(() =>
    this.rows().length === 0
      ? 'empty'
      : panelState(this.timeline, (value) => value.buckets.length === 0),
  );
  protected readonly chartHeight = computed(() => timelineHeight(Math.max(1, this.rows().length)));
  protected readonly chart = computed(() => {
    const timeline = this.timeline.value();
    if (!timeline) {
      return null;
    }
    const rows = this.rows();
    const markers = this.visibility.visible(this.markers.value() ?? []);
    return (ink: ChartInk) => timelineChart(timeline, rows, markers, ink);
  });
  protected readonly ignored = computed(() => {
    const timeline = this.timeline.value();
    if (!timeline) {
      return [];
    }
    return timeline.series
      .filter((series) => series.ignoredFilters.length > 0)
      .map((series) => TIMELINE_LABELS[series.metric].label);
  });

  protected readonly chartEvents: ChartEvents = {
    brushEnd: (params) => {
      const timeline = this.timeline.value();
      const area = (params as BrushParams).areas?.[0]?.coordRange;
      if (!timeline || !area) {
        this.selection.set(null);
        return;
      }
      const first = Date.parse(timeline.from);
      const start = Math.max(0, Math.min(area[0], area[1]));
      const end = Math.min(timeline.buckets.length - 1, Math.max(area[0], area[1]));
      this.selection.set({
        from: first + start * timeline.bucketMs,
        to: first + (end + 1) * timeline.bucketMs,
      });
    },
  };

  private drawn: EChartsType | null = null;

  protected readonly afterDraw = (chart: EChartsType): void => {
    this.drawn = chart;
    chart.dispatchAction({
      type: 'takeGlobalCursor',
      key: 'brush',
      brushOption: { brushType: 'lineX', brushMode: 'single' },
    });
    const selection = this.selection();
    const timeline = this.timeline.value();
    if (!selection || !timeline) {
      return;
    }
    const first = Date.parse(timeline.from);
    chart.dispatchAction({
      type: 'brush',
      areas: [
        {
          brushType: 'lineX',
          xAxisIndex: 0,
          coordRange: [
            Math.round((selection.from - first) / timeline.bucketMs),
            Math.round((selection.to - first) / timeline.bucketMs) - 1,
          ],
        },
      ],
    });
  };

  protected readonly table = computed(() => {
    const timeline = this.timeline.value();
    if (!timeline || this.view() !== 'table') {
      return null;
    }
    const columns = this.rows().flatMap((row) => rowSeries(row, timeline));
    return {
      columns: columns.map((column) => ({ name: column.name, colour: column.colour })),
      rows: timeline.buckets.map((at, index) => ({
        at: instantLabel(at),
        values: columns.map((column) => column.values[index] ?? null),
      })),
    };
  });

  protected toggleRow(key: string): void {
    this.rowKeys.update((keys) =>
      keys.includes(key) ? keys.filter((one) => one !== key) : [...keys, key],
    );
  }

  protected zoomToSelection(): void {
    const selection = this.selection();
    if (selection) {
      this.range.zoomTo(selection);
    }
  }

  protected clearSelection(): void {
    this.selection.set(null);
    this.drawn?.dispatchAction({ type: 'brush', areas: [] });
  }

  protected toggleKind(kind: ActivityKind): void {
    this.hiddenKinds.update((hidden) => {
      const next = new Set(hidden);
      if (!next.delete(kind)) {
        next.add(kind);
      }
      return next;
    });
  }

  protected chooseSource(value: string): void {
    this.source.set(value === '' ? null : value);
  }

  protected text(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  // The selection, or the whole window, against the window before it and the same hours a week
  // earlier.
  protected readonly summary = resource({
    params: () => ({
      focus: this.focus(),
      filters: { releaseId: this.releaseId(), source: this.source() },
    }),
    loader: async ({ params }) => {
      const { from, to } = params.focus;
      const span = to - from;
      const bucket = summaryBucket(span);
      const [current, previous, lastWeek] = await Promise.all([
        this.api.timeline({ from, to }, bucket, TIMELINE_METRIC_NAMES, params.filters),
        this.api.timeline(
          { from: from - span, to: from },
          bucket,
          TIMELINE_METRIC_NAMES,
          params.filters,
        ),
        this.api.timeline(
          { from: from - WEEK_MS, to: to - WEEK_MS },
          bucket,
          TIMELINE_METRIC_NAMES,
          params.filters,
        ),
      ]);
      return { current, previous, lastWeek };
    },
  });
  protected readonly summaryState = computed(() => panelState(this.summary, () => false));
  protected readonly summaryRows = computed<SummaryRow[]>(() => {
    const value = this.summary.value();
    if (!value) {
      return [];
    }
    return TIMELINE_METRIC_NAMES.map((metric) => ({
      metric,
      label: TIMELINE_LABELS[metric].label,
      who: TIMELINE_LABELS[metric].who,
      colour: TIMELINE_LABELS[metric].colour,
      combine: value.current.series.find((series) => series.metric === metric)?.combine ?? 'sum',
      current: totalOf(value.current, metric),
      previous: totalOf(value.previous, metric),
      lastWeek: totalOf(value.lastWeek, metric),
    }));
  });
  protected readonly focusLabel = computed(() => {
    const { from, to } = this.focus();
    return `${instantLabel(from)} – ${instantLabel(to)} UTC · ${spanLabel(to - from)}`;
  });
  protected readonly previousLabel = computed(
    () => `${spanLabel(this.focus().to - this.focus().from)} before`,
  );

  /** What the tabs that declined analytics did in the focus, beside those that accepted it. */
  protected readonly consent = computed(() => {
    const value = this.summary.value();
    if (!value) {
      return null;
    }
    const accepted = totalOf(value.current, 'plays_consented') ?? 0;
    const anonymous = totalOf(value.current, 'plays_anonymous') ?? 0;
    const declined = totalOf(value.current, 'plays_declined') ?? 0;
    const unanswered = totalOf(value.current, 'plays_unanswered') ?? 0;
    const signedIn = totalOf(value.current, 'plays_anonymous_signed_in') ?? 0;
    const plays = accepted + anonymous;
    const accounts = totalOf(value.current, 'signups') ?? 0;
    const unlinked = totalOf(value.current, 'signups_unlinked') ?? 0;
    const share = (part: number): number | null =>
      plays > 0 ? Math.round((part / plays) * 100) : null;
    return {
      plays,
      anonymousShare: share(anonymous),
      declinedShare: share(declined),
      unansweredShare: share(unanswered),
      signedIn,
      accounts,
      unlinked,
      bars: [
        { label: 'Accepted', value: accepted, colour: CONSENT_COLOURS.accepted },
        { label: 'Declined', value: declined, colour: CONSENT_COLOURS.declined },
        { label: 'Not answered', value: unanswered, colour: CONSENT_COLOURS.unanswered },
        {
          label: 'Not sent',
          value: Math.max(0, anonymous - declined - unanswered),
          colour: CONSENT_COLOURS.unknown,
        },
      ]
        .filter((bar) => bar.value > 0 || bar.label !== 'Not sent')
        .map((bar) => ({ ...bar, share: plays > 0 ? (bar.value / plays) * 100 : 0 })),
    };
  });

  protected readonly activity = resource({
    params: () => this.focus(),
    loader: ({ params }) => this.api.activity(params, 300),
  });
  protected readonly kinds = computed(() => {
    const items = this.activity.value()?.items ?? [];
    return (Object.keys(KIND_LABELS) as ActivityKind[])
      .map((kind) => ({
        kind,
        ...KIND_LABELS[kind],
        count: items
          .filter((item) => item.kind === kind)
          .reduce((sum, item) => sum + item.count, 0),
      }))
      .filter((kind) => kind.count > 0);
  });
  protected readonly feed = computed(() => {
    const hidden = this.hiddenKinds();
    const journey = this.journeyFilter();
    return (this.activity.value()?.items ?? []).filter(
      (item) => !hidden.has(item.kind) && (journey === null || item.journey === journey),
    );
  });
  protected readonly activityState = computed(() =>
    panelState(this.activity, (value) => value.items.length === 0),
  );

  protected readonly arrivals = resource({
    params: () => ({ focus: this.focus(), source: this.source() }),
    loader: ({ params }) => this.api.arrivals(params.focus, params.source, 100),
  });
  protected readonly arrivalsState = computed(() =>
    panelState(
      this.arrivals,
      (value) => value.summary.arrived === 0 && value.summary.anonymousPlays === 0,
    ),
  );
  protected readonly steps = computed(() => {
    const summary = this.arrivals.value()?.summary;
    if (!summary) {
      return [];
    }
    const share = (count: number): number | null =>
      summary.arrived > 0 ? Math.round((count / summary.arrived) * 100) : null;
    return [
      { label: 'Arrived', count: summary.arrived, share: share(summary.arrived) },
      { label: 'Played a game', count: summary.played, share: share(summary.played) },
      { label: 'Created an account', count: summary.signedUp, share: share(summary.signedUp) },
      {
        label: 'Created a project',
        count: summary.createdProject,
        share: share(summary.createdProject),
      },
      { label: 'Published a game', count: summary.published, share: share(summary.published) },
    ];
  });

  protected describe(item: ActivityItem): string {
    switch (item.kind) {
      case 'FIRST_VISIT':
        return [this.sourceName(item.source), this.whereOf(item.country, item.device)]
          .filter((part) => part !== '')
          .join(' · ');
      case 'ANONYMOUS_PLAYS':
        return `${formatCount(item.count)} × ${item.game ?? 'a deleted game'} · ${ANSWER_LABELS[item.consent ?? 'UNKNOWN']}${item.signedIn ? ', signed in' : ''}`;
      case 'MP_SESSION':
        return `${item.game ?? 'A deleted game'} · ${formatCount(item.count)} players at most`;
      case 'SIGNUP':
        return item.journey
          ? 'Linked to a browser that accepted analytics'
          : 'Declined analytics, or not linked yet';
      default:
        return item.game ?? '';
    }
  }

  protected whereOf(country: string | null, device: string | null): string {
    return [country, device].filter((part) => part !== null).join(' · ');
  }

  protected sourceName(source: string | null): string {
    if (!source) {
      return '';
    }
    const [kind, ...rest] = source.split(':');
    const value = rest.join(':');
    if (kind === 'referrer') {
      return value === '(none)' ? 'Direct' : value;
    }
    return kind === 'utmCampaign' ? `campaign ${value}` : `utm ${value}`;
  }

  protected kindOf(kind: ActivityKind): { label: string; icon: IconName; tone: string } {
    return KIND_LABELS[kind];
  }

  protected change(
    current: number | null,
    before: number | null,
  ): { text: string; tone: string } | null {
    if (current === null || before === null) {
      return null;
    }
    if (before === 0) {
      return current === 0
        ? { text: '=', tone: 'text-ink-4' }
        : { text: 'new', tone: 'text-jade-ink' };
    }
    const percent = Math.round(((current - before) / before) * 100);
    return {
      text: `${percent > 0 ? '+' : ''}${String(percent)}%`,
      tone: percent > 0 ? 'text-jade-ink' : percent < 0 ? 'text-hot-ink' : 'text-ink-4',
    };
  }

  protected readonly formatCount = formatCount;
  protected readonly instantLabel = instantLabel;
  protected readonly panelError = panelError;
}
