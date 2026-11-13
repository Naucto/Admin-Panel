import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import type { ChartInk } from '../../charts/palette';
import { impactChart } from '../../charts/timeline-options';
import { errorMessage } from '../../core/api-error';
import {
  addValues,
  BASELINE_WEEKS,
  cumulativeOf,
  type Impact,
  impactOf,
  valuesOf,
} from '../../core/impact';
import {
  DAY_MS,
  fromUtcInput,
  HOUR_MS,
  instantLabel,
  localLabel,
  spanLabel,
  toUtcInput,
  WEEK_MS,
} from '../../core/instants';
import { formatCount } from '../../core/metric-catalog';
import { TimelineApi } from '../../core/timeline.api';
import { BUCKET_MS, CONSENT_COLOURS, TIMELINE_LABELS } from '../../core/timeline-catalog';
import type {
  GameChoice,
  Marker,
  MarkerAudience,
  MarkerInput,
  Timeline,
  TimelineMetric,
} from '../../core/types';
import { ChartDirective } from '../../ui/chart.directive';
import { FeedbackService } from '../../ui/feedback.service';
import { GamePickerComponent } from '../../ui/game-picker.component';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';

type ImpactWindow = '6h' | '24h' | '48h' | '7d';

const WINDOWS: { value: ImpactWindow; label: string; ms: number }[] = [
  { value: '6h', label: '6 h', ms: 6 * HOUR_MS },
  { value: '24h', label: '24 h', ms: DAY_MS },
  { value: '48h', label: '48 h', ms: 2 * DAY_MS },
  { value: '7d', label: '7 days', ms: WEEK_MS },
];

const IMPACT_METRICS: TimelineMetric[] = [
  'visitors_new',
  'sessions',
  'players_new',
  'plays_consented',
  'plays_anonymous',
  'plays_declined',
  'plays_unanswered',
  'signups',
  'signups_unlinked',
  'projects_created',
  'projects_forked',
  'releases_published',
  'mp_sessions',
];

/** What a post about one game is read against: its plays, or for creators its forks. */
const GAME_METRICS: Record<MarkerAudience, TimelineMetric[]> = {
  EVERYONE: ['plays_consented', 'plays_anonymous', 'players_new', 'projects_forked'],
  PLAYERS: [
    'plays_consented',
    'plays_anonymous',
    'plays_declined',
    'plays_unanswered',
    'players_new',
  ],
  CREATORS: ['projects_forked'],
};

/** The rows each audience reads first; the others follow in their usual order. */
const ROW_ORDER: Record<MarkerAudience, string[]> = {
  EVERYONE: ['visitors_new', 'plays_all', 'signups'],
  PLAYERS: ['game:plays_all', 'game:players_new', 'plays_all', 'visitors_new', 'players_new'],
  CREATORS: [
    'game:projects_forked',
    'signups',
    'projects_created',
    'projects_forked',
    'releases_published',
    'signups_unlinked',
    'visitors_new',
  ],
};

export const AUDIENCES: { value: MarkerAudience; label: string }[] = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'PLAYERS', label: 'Players' },
  { value: 'CREATORS', label: 'Creators' },
];

export const CHANNELS = [
  'YouTube',
  'TikTok',
  'Instagram',
  'X',
  'Reddit',
  'Discord',
  'Bluesky',
  'itch.io',
  'Newsletter',
];

/** Where a post on a channel sends people from, as the referrer the backend records. */
const CHANNEL_REFERRERS: Record<string, string[]> = {
  youtube: ['youtube.com', 'youtu.be', 'm.youtube.com'],
  tiktok: ['tiktok.com'],
  instagram: ['instagram.com', 'l.instagram.com'],
  x: ['x.com', 't.co', 'twitter.com'],
  reddit: ['reddit.com', 'old.reddit.com', 'out.reddit.com'],
  discord: ['discord.com', 'discordapp.com'],
  bluesky: ['bsky.app'],
  'itch.io': ['itch.io'],
};

export interface ImpactRow {
  key: string;
  label: string;
  colour: string;
  impact: Impact;
  /** Series the chart can draw, as a curve. */
  values: (number | null)[];
}

interface Draft {
  at: string;
  label: string;
  channel: string;
  url: string;
  audience: MarkerAudience;
  game: GameChoice | null;
}

const emptyDraft = (): Draft => ({
  at: toUtcInput(Math.floor(Date.now() / 60_000) * 60_000),
  label: '',
  channel: '',
  url: '',
  audience: 'EVERYONE',
  game: null,
});

/** Rows sorted with the audience's own first, keeping the rest in their order. */
export function orderRows(rows: ImpactRow[], audience: MarkerAudience): ImpactRow[] {
  const order = ROW_ORDER[audience];
  const rank = (row: ImpactRow): number => {
    const index = order.indexOf(row.key);
    return index < 0 ? order.length : index;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b));
}

/** The row a post's curve opens on. */
export function defaultCurve(marker: Marker): string {
  if (marker.audience === 'CREATORS') {
    return marker.releaseId === null ? 'projects_created' : 'game:projects_forked';
  }
  return marker.releaseId === null ? 'visitors_new' : 'game:plays_all';
}

@Component({
  selector: 'nc-posts-page',
  imports: [
    ChartDirective,
    GamePickerComponent,
    IconComponent,
    PanelComponent,
    RouterLink,
    SegmentedComponent,
  ],
  templateUrl: './posts.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PostsPage {
  private readonly api = inject(TimelineApi);
  private readonly feedback = inject(FeedbackService);

  protected readonly channels = CHANNELS;
  protected readonly audiences = AUDIENCES;
  protected readonly windows = WINDOWS.map(({ value, label }) => ({ value, label }));

  protected readonly markers = resource({ loader: () => this.api.markers() });
  protected readonly listQuery = signal('');
  protected readonly listed = computed(() => {
    const query = this.listQuery().trim().toLowerCase();
    return [...(this.markers.value() ?? [])]
      .reverse()
      .filter(
        (marker) =>
          query === '' ||
          [marker.label, marker.channel ?? '', marker.game ?? ''].some((text) =>
            text.toLowerCase().includes(query),
          ),
      );
  });
  protected readonly markersState = computed(() =>
    panelState(this.markers, (value) => value.length === 0),
  );

  protected readonly draft = signal<Draft>(emptyDraft());
  protected readonly editing = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly draftAt = computed(() => fromUtcInput(this.draft().at));
  protected readonly draftLocal = computed(() => {
    const at = this.draftAt();
    return at === null ? '' : localLabel(at);
  });
  protected readonly draftValid = computed(
    () => this.draftAt() !== null && this.draft().label.trim() !== '',
  );
  protected readonly gameLabel = computed(() =>
    this.draft().audience === 'CREATORS' ? 'Game to fork, if any' : 'Game, if any',
  );

  protected readonly selectedId = signal<number | null>(null);
  protected readonly selected = computed(() => {
    const markers = this.markers.value() ?? [];
    const id = this.selectedId();
    return markers.find((marker) => marker.id === id) ?? markers.at(-1) ?? null;
  });
  protected readonly window = signal<ImpactWindow>('24h');
  protected readonly windowMs = computed(
    () => WINDOWS.find((one) => one.value === this.window())?.ms ?? DAY_MS,
  );
  protected readonly source = signal<string | null>(null);
  protected readonly curveKey = signal<string>('visitors_new');

  /** Other posts whose own effect overlaps this one's window. */
  protected readonly overlapping = computed(() => {
    const marker = this.selected();
    if (!marker) {
      return [];
    }
    const at = Date.parse(marker.at);
    return (this.markers.value() ?? []).filter((other) => {
      const otherAt = Date.parse(other.at);
      return (
        other.id !== marker.id && otherAt > at - this.windowMs() && otherAt < at + this.windowMs()
      );
    });
  });

  protected readonly impact = resource({
    params: () => {
      const marker = this.selected();
      return marker ? { marker, windowMs: this.windowMs() } : undefined;
    },
    loader: async ({ params }) => {
      const at = Date.parse(params.marker.at);
      const hour = Math.floor(at / HOUR_MS) * HOUR_MS;
      const range = { from: hour - BASELINE_WEEKS * WEEK_MS, to: hour + params.windowMs };
      const [all, game] = await Promise.all([
        this.api.timeline(range, '1h', IMPACT_METRICS),
        params.marker.releaseId === null
          ? Promise.resolve(null)
          : this.api.timeline(range, '1h', GAME_METRICS[params.marker.audience], {
              releaseId: params.marker.releaseId,
            }),
      ]);
      return { all, game, at, windowMs: params.windowMs };
    },
  });
  protected readonly impactState = computed(() =>
    this.selected() === null ? 'empty' : panelState(this.impact, () => false),
  );

  protected readonly impactRows = computed<ImpactRow[]>(() => {
    const value = this.impact.value();
    const marker = this.selected();
    if (!value || !marker) {
      return [];
    }
    const rowsOf = (timeline: Timeline, prefix: string, labelPrefix: string): ImpactRow[] => {
      const starts = timeline.buckets.map((at) => Date.parse(at));
      const build = (
        key: string,
        label: string,
        colour: string,
        values: (number | null)[],
      ): ImpactRow => ({
        key: `${prefix}${key}`,
        label: `${labelPrefix}${label}`,
        colour,
        values,
        impact: impactOf(starts, values, timeline.bucketMs, value.at, value.windowMs),
      });
      const metrics = timeline.series.map((series) =>
        build(
          series.metric,
          TIMELINE_LABELS[series.metric].label,
          TIMELINE_LABELS[series.metric].colour,
          series.values,
        ),
      );
      const hasPlays = timeline.series.some((series) => series.metric === 'plays_consented');
      const plays = addValues(
        valuesOf(timeline, 'plays_consented'),
        valuesOf(timeline, 'plays_anonymous'),
      );
      return hasPlays
        ? [build('plays_all', 'All plays', CONSENT_COLOURS.accepted, plays), ...metrics]
        : metrics;
    };
    const name = marker.game ?? `#${String(marker.releaseId)}`;
    return orderRows(
      [
        ...(value.game ? rowsOf(value.game, 'game:', `${name} · `) : []),
        ...rowsOf(value.all, '', ''),
      ],
      marker.audience,
    );
  });

  protected readonly curve = computed(() => {
    const value = this.impact.value();
    const row =
      this.impactRows().find((one) => one.key === this.curveKey()) ?? this.impactRows()[0];
    if (!value || !row) {
      return null;
    }
    const starts = value.all.buckets.map((at) => Date.parse(at));
    const curve = cumulativeOf(starts, row.values, BUCKET_MS['1h'], value.at, value.windowMs);
    return {
      label: row.label,
      spec: (ink: ChartInk) => impactChart(curve, row.label, row.colour, ink),
    };
  });

  protected readonly sources = resource({
    params: () => {
      const marker = this.selected();
      if (!marker) {
        return undefined;
      }
      const at = Date.parse(marker.at);
      return { from: at, to: at + this.windowMs() };
    },
    loader: ({ params }) => this.api.sources(params),
  });
  /** The referrer a post's channel sends people from, when people did come from it. */
  protected readonly suggestedSource = computed(() => {
    const channel = this.selected()?.channel?.toLowerCase() ?? '';
    const domains = CHANNEL_REFERRERS[channel] ?? [];
    return (
      (this.sources.value() ?? []).find(
        (one) => one.kind === 'referrer' && one.value !== null && domains.includes(one.value),
      )?.source ?? null
    );
  });

  protected readonly arrivals = resource({
    params: () => {
      const marker = this.selected();
      if (!marker) {
        return undefined;
      }
      const at = Date.parse(marker.at);
      return { range: { from: at, to: at + this.windowMs() }, source: this.source() };
    },
    loader: ({ params }) => this.api.arrivals(params.range, params.source, 20),
  });

  protected readonly timelineLink = computed(() => {
    const marker = this.selected();
    if (!marker) {
      return null;
    }
    const at = Date.parse(marker.at);
    return {
      from: new Date(at - Math.max(6 * HOUR_MS, this.windowMs() / 4)).toISOString(),
      to: new Date(at + this.windowMs()).toISOString(),
      ...(marker.releaseId === null ? {} : { game: String(marker.releaseId) }),
    };
  });
  protected readonly windowLabel = computed(() => spanLabel(this.windowMs()));

  protected select(marker: Marker): void {
    this.selectedId.set(marker.id);
    this.source.set(null);
    this.curveKey.set(defaultCurve(marker));
  }

  protected update(field: 'at' | 'label' | 'channel' | 'url', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected setAudience(audience: MarkerAudience): void {
    this.draft.update((draft) => ({ ...draft, audience }));
  }

  protected setGame(game: GameChoice | null): void {
    this.draft.update((draft) => ({ ...draft, game }));
  }

  protected edit(marker: Marker): void {
    this.editing.set(marker.id);
    this.draft.set({
      at: toUtcInput(Date.parse(marker.at)),
      label: marker.label,
      channel: marker.channel ?? '',
      url: marker.url ?? '',
      audience: marker.audience,
      game:
        marker.releaseId === null
          ? null
          : { releaseId: marker.releaseId, name: marker.game ?? `#${String(marker.releaseId)}` },
    });
  }

  protected cancel(): void {
    this.editing.set(null);
    this.draft.set(emptyDraft());
  }

  protected async save(): Promise<void> {
    const at = this.draftAt();
    const draft = this.draft();
    if (at === null || draft.label.trim() === '') {
      return;
    }
    const input: MarkerInput = {
      at: new Date(at).toISOString(),
      label: draft.label.trim(),
      channel: draft.channel.trim() || null,
      url: draft.url.trim() || null,
      audience: draft.audience,
      releaseId: draft.game?.releaseId ?? null,
    };
    this.saving.set(true);
    try {
      const id = this.editing();
      const saved =
        id === null ? await this.api.createMarker(input) : await this.api.updateMarker(id, input);
      this.feedback.toast(id === null ? `“${saved.label}” is on the charts.` : 'Post updated.');
      this.cancel();
      this.markers.reload();
      this.selectedId.set(saved.id);
    } catch (error) {
      this.feedback.toast(errorMessage(error), 'error');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(marker: Marker): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Remove this post?',
      message: `“${marker.label}” of ${instantLabel(marker.at)} UTC leaves every chart. The data around it stays.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await this.api.deleteMarker(marker.id);
      this.feedback.toast('Post removed.');
      if (this.editing() === marker.id) {
        this.cancel();
      }
      this.markers.reload();
    } catch (error) {
      this.feedback.toast(errorMessage(error), 'error');
    }
  }

  protected chooseSource(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.source.set(value === '' ? null : value);
  }

  protected sourceName(source: string): string {
    const [kind, ...rest] = source.split(':');
    const value = rest.join(':');
    if (kind === 'referrer') {
      return value === '(none)' ? 'Direct' : value;
    }
    return kind === 'utmCampaign' ? `campaign ${value}` : `utm ${value}`;
  }

  protected audienceName(audience: MarkerAudience): string {
    return AUDIENCES.find((one) => one.value === audience)?.label ?? audience;
  }

  protected liftText(impact: Impact): { text: string; tone: string } {
    if (impact.difference === null) {
      return { text: '--', tone: 'text-ink-4' };
    }
    if (impact.lift === null) {
      return impact.difference > 0
        ? { text: 'from none', tone: 'text-jade-ink' }
        : { text: '=', tone: 'text-ink-4' };
    }
    const percent = Math.round(impact.lift * 100);
    return {
      text: `${percent > 0 ? '+' : ''}${String(percent)}%`,
      tone: percent > 0 ? 'text-jade-ink' : percent < 0 ? 'text-hot-ink' : 'text-ink-4',
    };
  }

  protected figure(value: number | null): string {
    return value === null ? '--' : formatCount(Math.round(value * 10) / 10);
  }

  protected signed(value: number | null): string {
    if (value === null) {
      return '--';
    }
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${formatCount(rounded)}`;
  }

  protected baselineNote(row: ImpactRow | undefined): string {
    const impact = row?.impact;
    if (!impact || impact.baselineKind === null) {
      return 'No earlier data to compare with yet.';
    }
    const usual =
      impact.baselineKind === 'weeks'
        ? `Usual: median of the same hours over the ${String(impact.weeks)} week${impact.weeks > 1 ? 's' : ''} before.`
        : 'Usual: the same length of time just before the post.';
    return impact.elapsed < 1
      ? `${usual} ${String(Math.round(impact.elapsed * 100))}% of the window so far.`
      : usual;
  }

  protected readonly formatCount = formatCount;
  protected readonly instantLabel = instantLabel;
  protected readonly panelError = panelError;
}
