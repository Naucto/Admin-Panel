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
import {
  BUG_CATEGORY_LABELS,
  BUG_STATUS_LABELS,
  BUG_VIEW_LABELS,
  bugStatusChip,
  optionsOf,
} from '../../core/support-format';
import type { BugCategory, BugSummary, BugView } from '../../core/types';
import { UserFeedbackApi } from '../../core/user-feedback.api';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';

const PAGE_SIZE = 20;

const EMPTY_TITLES: Record<BugView, string> = {
  NEW: 'No new bug reports',
  OPEN: 'No open bug reports',
  CLOSED: 'No closed bug reports',
  ALL: 'No bug reports yet',
};

/** The bug reports people sent from Naucto, newest first, each opening on its own page. */
@Component({
  selector: 'nc-bugs-page',
  imports: [AccountCellComponent, IconComponent, PanelComponent, RouterLink, SegmentedComponent],
  templateUrl: './bugs.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BugsPage {
  private readonly api = inject(UserFeedbackApi);
  private readonly router = inject(Router);

  protected readonly views = optionsOf(BUG_VIEW_LABELS);
  protected readonly categories = optionsOf(BUG_CATEGORY_LABELS);
  protected readonly view = signal<BugView>('OPEN');
  protected readonly category = signal<BugCategory | ''>('');
  protected readonly page = linkedSignal({
    source: () => ({ view: this.view(), category: this.category() }),
    computation: () => 1,
  });

  protected readonly bugs = resource({
    params: () => ({
      view: this.view(),
      category: this.category() || undefined,
      page: this.page(),
    }),
    loader: ({ params }) => this.api.bugs(params.view, params.category, params.page, PAGE_SIZE),
  });
  protected readonly bugsState = computed(() =>
    panelState(this.bugs, (value) => value.items.length === 0),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.bugs.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly emptyTitle = computed(() => EMPTY_TITLES[this.view()]);
  protected readonly emptyHint = computed(() =>
    this.category()
      ? 'Nothing in this category. Pick all categories to see the rest.'
      : 'Reports appear as people send them from the bug report form in Naucto.',
  );

  protected open(bug: BugSummary): void {
    void this.router.navigate(['/bugs', bug.id]);
  }

  protected setCategory(value: string): void {
    this.category.set(value as BugCategory | '');
  }

  protected readonly categoryLabels = BUG_CATEGORY_LABELS;
  protected readonly statusLabels = BUG_STATUS_LABELS;
  protected readonly bugStatusChip = bugStatusChip;
  protected readonly dayTime = dayTime;
  protected readonly shortAgo = shortAgo;
  protected readonly panelError = panelError;
}
