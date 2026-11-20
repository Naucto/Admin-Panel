import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { dayTime, shortAgo } from '../core/dates';
import { ACTION_LABELS, actionChip, REASON_LABELS } from '../core/moderation-format';
import type { ModerationAction } from '../core/types';
import { EntityLinkComponent } from './entity-link.component';

/** What staff did about a target or an account, newest first as the backend sends it. */
@Component({
  selector: 'nc-history-list',
  imports: [EntityLinkComponent],
  templateUrl: './history-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryListComponent {
  readonly actions = input.required<readonly ModerationAction[]>();
  readonly emptyText = input('Nothing done yet');
  /** Off where every row is about the same target and naming it again says nothing. */
  readonly showTarget = input(true);

  protected readonly actionLabels = ACTION_LABELS;
  protected readonly reasonLabels = REASON_LABELS;
  protected readonly actionChip = actionChip;
  protected readonly shortAgo = shortAgo;
  protected readonly dayTime = dayTime;

  protected actorName(action: ModerationAction): string {
    return action.actor.deleted
      ? 'Deleted account'
      : action.actor.nickname || action.actor.username;
  }
}
