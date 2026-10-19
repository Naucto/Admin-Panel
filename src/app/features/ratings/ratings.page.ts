import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ratingTrendChart, scoreDistributionChart } from '../../charts/options';
import type { ChartInk } from '../../charts/palette';
import { dayTime, longDay, utcDay } from '../../core/dates';
import { FiltersStore } from '../../core/filters.store';
import { formatCount } from '../../core/metric-catalog';
import {
  CONTEXT_LABELS,
  formatAverage,
  formatShare,
  LOW_SCORE,
  REASON_LABELS,
  scoreChip,
  scoreInk,
  SOURCE_LABELS,
} from '../../core/support-format';
import type { FeedbackContext, Rating } from '../../core/types';
import { UserFeedbackApi } from '../../core/user-feedback.api';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { ChartDirective } from '../../ui/chart.directive';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { type SegmentOption, SegmentedComponent } from '../../ui/segmented.component';
import { StatTileComponent } from '../../ui/stat-tile.component';

type ContextFilter = 'ALL' | FeedbackContext;

const PAGE_SIZE = 20;

/** How people rate Naucto: the scores of the range, how they moved, and every answer in full. */
@Component({
  selector: 'nc-ratings-page',
  imports: [
    AccountCellComponent,
    ChartDirective,
    IconComponent,
    PanelComponent,
    RouterLink,
    SegmentedComponent,
    StatTileComponent,
  ],
  templateUrl: './ratings.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RatingsPage {
  private readonly api = inject(UserFeedbackApi);
  protected readonly filters = inject(FiltersStore);

  protected readonly summary = resource({
    params: () => ({ range: this.filters.range(), grain: this.filters.grain() }),
    loader: ({ params }) => this.api.ratingSummary(params.range, params.grain),
  });
  protected readonly summaryState = computed(() =>
    panelState(this.summary, (value) => value.count === 0),
  );
  protected readonly distributionOption = computed(() => {
    const value = this.summary.value();
    return value ? (ink: ChartInk) => scoreDistributionChart(value.distribution, ink) : null;
  });
  protected readonly trendOption = computed(() => {
    const value = this.summary.value();
    const grain = this.filters.grain();
    return value ? (ink: ChartInk) => ratingTrendChart(value.series, grain, ink) : null;
  });

  protected readonly contexts: SegmentOption<ContextFilter>[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PLAYER', label: 'Players' },
    { value: 'CREATOR', label: 'Creators' },
  ];
  protected readonly context = signal<ContextFilter>('ALL');
  protected readonly lowOnly = signal(false);
  protected readonly withComments = signal(false);
  protected readonly page = linkedSignal({
    source: () => ({
      context: this.context(),
      lowOnly: this.lowOnly(),
      withComments: this.withComments(),
      range: this.filters.range(),
    }),
    computation: () => 1,
  });
  protected readonly ratings = resource({
    params: () => {
      const context = this.context();
      return {
        ...this.filters.range(),
        context: context === 'ALL' ? undefined : context,
        maxScore: this.lowOnly() ? LOW_SCORE : undefined,
        withComments: this.withComments(),
        page: this.page(),
        limit: PAGE_SIZE,
      };
    },
    loader: ({ params }) => this.api.ratings(params),
  });
  protected readonly ratingsState = computed(() =>
    panelState(this.ratings, (value) => value.items.length === 0),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.ratings.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly filtered = computed(
    () => this.context() !== 'ALL' || this.lowOnly() || this.withComments(),
  );

  /** The rating read in full under the table. */
  protected readonly selected = signal<Rating | null>(null);

  protected toggle(rating: Rating): void {
    this.selected.set(this.selected()?.id === rating.id ? null : rating);
  }

  protected day(iso: string): string {
    return longDay(utcDay(Date.parse(iso)));
  }

  protected readonly contextLabels = CONTEXT_LABELS;
  protected readonly reasonLabels = REASON_LABELS;
  protected readonly sourceLabels = SOURCE_LABELS;
  protected readonly dayTime = dayTime;
  protected readonly formatAverage = formatAverage;
  protected readonly formatCount = formatCount;
  protected readonly formatShare = formatShare;
  protected readonly scoreChip = scoreChip;
  protected readonly scoreInk = scoreInk;
  protected readonly panelError = panelError;
}
