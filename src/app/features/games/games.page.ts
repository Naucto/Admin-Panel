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
import { shapeOf } from '../../charts/series-data';
import { AnalyticsApi } from '../../core/analytics.api';
import { utcDay } from '../../core/dates';
import { FiltersStore } from '../../core/filters.store';
import { formatCount, formatMetric } from '../../core/metric-catalog';
import type { GameSort, GameStats, Series } from '../../core/types';
import { ChartDirective } from '../../ui/chart.directive';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';

const PLAY_METRICS = ['plays', 'playtime_ms', 'players'] as const;
const MULTIPLAYER_METRICS = [
  'mp_rooms_created',
  'mp_rooms_connected',
  'mp_sessions',
  'mp_participants',
  'mp_minutes',
  'mp_player_minutes',
] as const;
const PAGE_SIZE = 10;

@Component({
  selector: 'nc-games-page',
  imports: [ChartDirective, IconComponent, PanelComponent, SegmentedComponent],
  templateUrl: './games.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GamesPage {
  private readonly api = inject(AnalyticsApi);
  protected readonly filters = inject(FiltersStore);

  protected readonly play = resource({
    params: () => ({ grain: this.filters.grain(), range: this.filters.range() }),
    loader: ({ params }) => this.api.seriesSet(PLAY_METRICS, params.grain, params.range),
  });
  protected readonly multiplayer = resource({
    params: () => ({ grain: this.filters.grain(), range: this.filters.range() }),
    loader: ({ params }) => this.api.seriesSet(MULTIPLAYER_METRICS, params.grain, params.range),
  });

  protected readonly sort = signal<GameSort>('playtime_ms');
  protected readonly sorts: { value: GameSort; label: string }[] = [
    { value: 'playtime_ms', label: 'Play time' },
    { value: 'plays', label: 'Plays' },
    { value: 'players', label: 'Players' },
    { value: 'mp_sessions', label: 'Multiplayer' },
  ];
  protected readonly page = signal(1);
  protected readonly games = resource({
    params: () => ({
      grain: this.filters.periodGrain(),
      day: utcDay(),
      sort: this.sort(),
      page: this.page(),
    }),
    loader: ({ params }) =>
      this.api.games(params.grain, params.day, params.sort, params.page, PAGE_SIZE),
  });
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.games.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly periodName = computed(() =>
    this.filters.periodGrain() === 'WEEK' ? 'this week' : 'this month',
  );

  /** The game whose own trend is open under the table. */
  protected readonly selected = signal<GameStats | null>(null);
  protected readonly gameTrend = resource({
    params: () => {
      const game = this.selected();
      return game
        ? { id: game.releaseId, grain: this.filters.grain(), range: this.filters.range() }
        : undefined;
    },
    loader: async ({ params }) => {
      const [plays, playtime] = await Promise.all([
        this.api.series('plays', params.grain, params.range, `release:${params.id}`),
        this.api.series('playtime_ms', params.grain, params.range, `release:${params.id}`),
      ]);
      return { plays, playtime };
    },
  });

  private emptyOf(names: readonly string[]) {
    return (set: Record<string, Series>) =>
      ['empty', 'zero'].includes(
        shapeOf(names.map((name) => set[name]).filter((one): one is Series => !!one)),
      );
  }

  protected readonly playState = computed(() =>
    panelState(this.play, this.emptyOf(['plays', 'playtime_ms'])),
  );
  protected readonly playOption = computed(() => {
    const set = this.play.value();
    const grain = this.filters.grain();
    if (!set?.['plays'] || !set['playtime_ms'] || !set['players']) {
      return null;
    }
    const lines = [
      { series: set['plays'], kind: 'bar' as const, colour: SERIES_COLOURS[3] },
      { series: set['players'], colour: SERIES_COLOURS[1] },
      { series: set['playtime_ms'], rightAxis: true, colour: SERIES_COLOURS[0], area: true },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });

  protected readonly gamesState = computed(() =>
    panelState(this.games, (value) => value.items.length === 0),
  );

  protected readonly gameTrendState = computed(() =>
    panelState(this.gameTrend, (value) =>
      ['empty', 'zero'].includes(shapeOf([value.plays, value.playtime])),
    ),
  );
  protected readonly gameTrendOption = computed(() => {
    const value = this.gameTrend.value();
    const grain = this.filters.grain();
    if (!value) {
      return null;
    }
    const lines = [
      { series: value.plays, kind: 'bar' as const, colour: SERIES_COLOURS[3] },
      { series: value.playtime, rightAxis: true, colour: SERIES_COLOURS[0] },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });

  protected readonly roomsState = computed(() =>
    panelState(this.multiplayer, this.emptyOf(['mp_rooms_created', 'mp_sessions'])),
  );
  protected readonly rooms = computed(() => {
    const set = this.multiplayer.value();
    const grain = this.filters.grain();
    if (!set?.['mp_rooms_created'] || !set['mp_rooms_connected'] || !set['mp_sessions']) {
      return null;
    }
    const lines = [
      { series: set['mp_rooms_created'], kind: 'bar' as const, colour: SERIES_COLOURS[1] },
      { series: set['mp_rooms_connected'], kind: 'bar' as const, colour: SERIES_COLOURS[4] },
      { series: set['mp_sessions'], kind: 'bar' as const, colour: SERIES_COLOURS[2] },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });
  protected readonly minutesState = computed(() =>
    panelState(this.multiplayer, this.emptyOf(['mp_minutes', 'mp_player_minutes'])),
  );
  protected readonly minutes = computed(() => {
    const set = this.multiplayer.value();
    const grain = this.filters.grain();
    if (!set?.['mp_minutes'] || !set['mp_player_minutes'] || !set['mp_participants']) {
      return null;
    }
    const lines = [
      { series: set['mp_player_minutes'], colour: SERIES_COLOURS[0], area: true },
      { series: set['mp_minutes'], colour: SERIES_COLOURS[2] },
      {
        series: set['mp_participants'],
        rightAxis: true,
        kind: 'bar' as const,
        colour: 'rgba(104, 174, 212, 0.5)',
      },
    ];
    return (ink: ChartInk) => trendChart(lines, grain, ink);
  });

  protected setSort(sort: GameSort): void {
    this.sort.set(sort);
    this.page.set(1);
  }

  protected toggle(game: GameStats): void {
    this.selected.set(this.selected()?.releaseId === game.releaseId ? null : game);
  }

  protected rank(index: number): number {
    return (this.page() - 1) * PAGE_SIZE + index + 1;
  }

  protected readonly formatCount = formatCount;
  protected readonly formatMetric = formatMetric;
  protected readonly panelError = panelError;
}
