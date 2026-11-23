import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth.store';
import { dayTime, shortAgo } from '../../core/dates';
import { shortId } from '../../core/ids';
import { ModerationApi } from '../../core/moderation.api';
import {
  bearsOnAccount,
  CASE_STATUS_LABELS,
  caseStatusChip,
  FLAG_STATUS_LABELS,
  flagStatusChip,
  REASON_LABELS,
  TARGET_STATE_LABELS,
  TARGET_TYPE_LABELS,
  targetStateChip,
} from '../../core/moderation-format';
import type {
  CaseFlag,
  ModerationOperation,
  ModerationTargetType,
  TargetContent,
} from '../../core/types';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { HistoryListComponent } from '../../ui/history-list.component';
import { IconComponent } from '../../ui/icon.component';
import { OperationButtonsComponent } from '../../ui/operation-buttons.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { ShortIdComponent } from '../../ui/short-id.component';
import { ModerationActions } from './moderation-actions.service';

/** Every report on one game, comment or profile, what staff did about it and what they may do. */
@Component({
  selector: 'nc-case-page',
  imports: [
    AccountCellComponent,
    HistoryListComponent,
    IconComponent,
    OperationButtonsComponent,
    PanelComponent,
    RouterLink,
    ShortIdComponent,
  ],
  templateUrl: './case.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CasePage {
  private readonly api = inject(ModerationApi);
  protected readonly actions = inject(ModerationActions);
  protected readonly auth = inject(AuthStore);

  /** The `:targetType` and `:targetId` of the route. */
  readonly targetType = input.required<ModerationTargetType>();
  readonly targetId = input.required<string>();

  protected readonly detail = resource({
    params: () => ({ type: this.targetType(), id: this.targetId() }),
    loader: ({ params }) => this.api.case(params.type, params.id),
  });
  protected readonly detailState = computed(() => panelState(this.detail, () => false));

  protected readonly title = computed(() => {
    const target = this.detail.value()?.target;
    return target ? target.label || `${TARGET_TYPE_LABELS[target.type]} ${shortId(target.id)}` : '';
  });
  protected readonly targetOperations = computed(() =>
    (this.detail.value()?.allowedActions ?? []).filter((operation) => !bearsOnAccount(operation)),
  );
  protected readonly accountOperations = computed(() =>
    (this.detail.value()?.allowedActions ?? []).filter(bearsOnAccount),
  );

  /** Whether a report kept the content as something else than what stands there now. */
  protected changedSince(flag: CaseFlag): boolean {
    const current = this.detail.value()?.current;
    return !current || !sameContent(flag.snapshot, current);
  }

  protected async run(operation: ModerationOperation): Promise<void> {
    const found = this.detail.value();
    if (!found) {
      return;
    }
    const open = found.flags.filter((flag) => flag.status === 'OPEN').map((flag) => flag.reason);
    const done = await this.actions.run(operation, {
      type: found.target.type,
      id: found.target.id,
      label: found.target.label,
      owner: found.target.owner,
      openFlags: found.openFlags,
      reasons: open.length > 0 ? open : found.reasons,
    });
    if (done) {
      this.detail.reload();
    }
  }

  protected readonly typeLabels = TARGET_TYPE_LABELS;
  protected readonly reasonLabels = REASON_LABELS;
  protected readonly stateLabels = TARGET_STATE_LABELS;
  protected readonly statusLabels = CASE_STATUS_LABELS;
  protected readonly flagStatusLabels = FLAG_STATUS_LABELS;
  protected readonly targetStateChip = targetStateChip;
  protected readonly caseStatusChip = caseStatusChip;
  protected readonly flagStatusChip = flagStatusChip;
  protected readonly dayTime = dayTime;
  protected readonly shortAgo = shortAgo;
  protected readonly panelError = panelError;
}

function sameContent(a: TargetContent, b: TargetContent): boolean {
  return a.title === b.title && a.body === b.body;
}
