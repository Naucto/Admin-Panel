import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth.store';
import { longDay, utcDay } from '../../core/dates';
import { ModerationApi } from '../../core/moderation.api';
import {
  caseRoute,
  STANDING_LABELS,
  standingChip,
  suspensionLabel,
} from '../../core/moderation-format';
import { roleLabel } from '../../core/roles';
import type { ModerationOperation } from '../../core/types';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { HistoryListComponent } from '../../ui/history-list.component';
import { IconComponent } from '../../ui/icon.component';
import { OperationButtonsComponent } from '../../ui/operation-buttons.component';
import { PagerComponent } from '../../ui/pager.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { ShortIdComponent } from '../../ui/short-id.component';
import { ModerationActions } from './moderation-actions.service';

const RECORD_PAGE_SIZE = 10;

/** One account: where it stands, what staff did about it, and what they may do now. */
@Component({
  selector: 'nc-user-detail-page',
  imports: [
    AccountCellComponent,
    HistoryListComponent,
    IconComponent,
    OperationButtonsComponent,
    PagerComponent,
    PanelComponent,
    RouterLink,
    ShortIdComponent,
  ],
  templateUrl: './user-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UserDetailPage {
  private readonly api = inject(ModerationApi);
  private readonly router = inject(Router);
  protected readonly actions = inject(ModerationActions);
  protected readonly auth = inject(AuthStore);

  /** The `:id` of the route. */
  readonly id = input.required<string>();

  protected readonly account = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.account(params),
  });
  protected readonly accountState = computed(() => panelState(this.account, () => false));

  protected readonly recordPage = linkedSignal({ source: () => this.id(), computation: () => 1 });
  protected readonly record = resource({
    params: () => ({ subjectUserId: this.id(), page: this.recordPage(), limit: RECORD_PAGE_SIZE }),
    loader: ({ params }) => this.api.log(params),
  });
  protected readonly recordState = computed(() =>
    panelState(this.record, (value) => value.items.length === 0),
  );
  protected readonly recordPages = computed(() =>
    Math.max(1, Math.ceil((this.record.value()?.total ?? 0) / RECORD_PAGE_SIZE)),
  );

  protected readonly figures = computed(() => {
    const found = this.account.value();
    return found
      ? [
          { label: 'Warnings', value: found.warnings },
          { label: 'Games', value: found.games },
          { label: 'Comments', value: found.comments },
          { label: 'Open reports', value: found.openFlags },
          { label: 'Reports filed', value: found.flagsFiled },
        ]
      : [];
  });

  protected async run(operation: ModerationOperation): Promise<void> {
    const found = this.account.value();
    if (!found) {
      return;
    }
    const done = await this.actions.run(operation, {
      type: 'USER',
      id: found.id,
      label: found.nickname || found.username,
      owner: found,
      openFlags: found.openFlags,
      reasons: [],
    });
    if (!done) {
      return;
    }
    if (operation === 'DELETE_ACCOUNT') {
      await this.router.navigate(['/moderation/users']);
      return;
    }
    this.account.reload();
    this.record.reload();
  }

  protected joined(iso: string): string {
    return longDay(utcDay(Date.parse(iso)));
  }

  protected readonly caseRoute = caseRoute;
  protected readonly standingLabels = STANDING_LABELS;
  protected readonly standingChip = standingChip;
  protected readonly suspensionLabel = suspensionLabel;
  protected readonly roleLabel = roleLabel;
  protected readonly panelError = panelError;
}
