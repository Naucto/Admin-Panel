import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { dayTime, shortAgo } from '../../core/dates';
import { ModerationApi } from '../../core/moderation.api';
import {
  CASE_VIEW_LABELS,
  caseRoute,
  REASON_LABELS,
  TARGET_STATE_LABELS,
  TARGET_TYPE_LABELS,
  targetStateChip,
} from '../../core/moderation-format';
import { optionsOf } from '../../core/support-format';
import type {
  CaseSort,
  CaseSummary,
  CaseView,
  ModerationReason,
  ModerationTargetType,
} from '../../core/types';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { IconComponent } from '../../ui/icon.component';
import { PagerComponent } from '../../ui/pager.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';

const PAGE_SIZE = 20;

const EMPTY_TITLES: Record<CaseView, string> = {
  OPEN: 'Nothing waits for a decision',
  RESOLVED: 'Nothing resolved yet',
  ALL: 'Nothing was reported yet',
};

/** What users reported, one row per game, comment or profile, with every report on it counted. */
@Component({
  selector: 'nc-queue-page',
  imports: [
    AccountCellComponent,
    IconComponent,
    PagerComponent,
    PanelComponent,
    RouterLink,
    SegmentedComponent,
  ],
  templateUrl: './queue.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class QueuePage {
  private readonly api = inject(ModerationApi);
  private readonly router = inject(Router);

  protected readonly views = optionsOf(CASE_VIEW_LABELS);
  protected readonly types = optionsOf(TARGET_TYPE_LABELS);
  protected readonly reasons = optionsOf(REASON_LABELS);
  protected readonly view = signal<CaseView>('OPEN');
  protected readonly targetType = signal<ModerationTargetType | ''>('');
  protected readonly reason = signal<ModerationReason | ''>('');
  protected readonly sort = signal<CaseSort>('lastFlagged');
  protected readonly page = linkedSignal({
    source: () => ({
      view: this.view(),
      targetType: this.targetType(),
      reason: this.reason(),
      sort: this.sort(),
    }),
    computation: () => 1,
  });

  protected readonly cases = resource({
    params: () => ({
      view: this.view(),
      targetType: this.targetType() || undefined,
      reason: this.reason() || undefined,
      sort: this.sort(),
      page: this.page(),
      limit: PAGE_SIZE,
    }),
    loader: ({ params }) => this.api.cases(params),
  });
  protected readonly casesState = computed(() =>
    panelState(this.cases, (value) => value.items.length === 0),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.cases.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly emptyTitle = computed(() => EMPTY_TITLES[this.view()]);
  protected readonly emptyHint = computed(() =>
    this.targetType() || this.reason()
      ? 'Nothing matches these filters. Clear them to see the rest.'
      : 'A game, a comment or a profile shows here once someone reports it on Naucto.',
  );

  protected setTargetType(value: string): void {
    this.targetType.set(value as ModerationTargetType | '');
  }

  protected setReason(value: string): void {
    this.reason.set(value as ModerationReason | '');
  }

  protected open(row: CaseSummary): void {
    void this.router.navigate(caseRoute(row.target.type, row.target.id));
  }

  protected label(row: CaseSummary): string {
    return row.target.label || `${TARGET_TYPE_LABELS[row.target.type]} #${row.target.id}`;
  }

  /** Under a comment, the game it was written on. */
  protected context(row: CaseSummary): string | null {
    return row.target.type === 'COMMENT' && row.target.projectName
      ? `On ${row.target.projectName}`
      : null;
  }

  protected readonly caseRoute = caseRoute;
  protected readonly typeLabels = TARGET_TYPE_LABELS;
  protected readonly reasonLabels = REASON_LABELS;
  protected readonly stateLabels = TARGET_STATE_LABELS;
  protected readonly targetStateChip = targetStateChip;
  protected readonly dayTime = dayTime;
  protected readonly shortAgo = shortAgo;
  protected readonly panelError = panelError;
}
