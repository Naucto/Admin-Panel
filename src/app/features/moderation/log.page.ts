import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { dayTime } from '../../core/dates';
import { idOf } from '../../core/ids';
import { ModerationApi } from '../../core/moderation.api';
import {
  ACTION_LABELS,
  actionChip,
  REASON_LABELS,
  TARGET_TYPE_LABELS,
} from '../../core/moderation-format';
import { optionsOf } from '../../core/support-format';
import type {
  ModerationAccountRef,
  ModerationActionType,
  ModerationTargetType,
} from '../../core/types';
import { EntityLinkComponent } from '../../ui/entity-link.component';
import { IconComponent } from '../../ui/icon.component';
import { PagerComponent } from '../../ui/pager.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';

const PAGE_SIZE = 30;

/** Everything staff did, newest first. Nothing here is ever edited or removed. */
@Component({
  selector: 'nc-log-page',
  imports: [EntityLinkComponent, IconComponent, PagerComponent, PanelComponent, RouterLink],
  templateUrl: './log.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LogPage {
  private readonly api = inject(ModerationApi);

  /** `?actor=`: only what one staff member did. A row's moderator links here. */
  readonly actor = input(undefined, { transform: idOf });

  protected readonly actionOptions = optionsOf(ACTION_LABELS);
  protected readonly typeOptions = optionsOf(TARGET_TYPE_LABELS);
  protected readonly action = signal<ModerationActionType | ''>('');
  protected readonly targetType = signal<ModerationTargetType | ''>('');
  protected readonly page = linkedSignal({
    source: () => ({ action: this.action(), type: this.targetType(), actor: this.actor() }),
    computation: () => 1,
  });

  protected readonly log = resource({
    params: () => ({
      action: this.action() || undefined,
      targetType: this.targetType() || undefined,
      actorId: this.actor(),
      page: this.page(),
      limit: PAGE_SIZE,
    }),
    loader: ({ params }) => this.api.log(params),
  });
  protected readonly logState = computed(() =>
    panelState(this.log, (value) => value.items.length === 0),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.log.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly hint = computed(() => {
    const total = this.log.value()?.total;
    return total === undefined
      ? ''
      : `${total} ${total === 1 ? 'action' : 'actions'}, all times UTC`;
  });
  protected readonly filtered = computed(
    () => !!this.action() || !!this.targetType() || this.actor() !== undefined,
  );

  protected setAction(value: string): void {
    this.action.set(value as ModerationActionType | '');
  }

  protected setTargetType(value: string): void {
    this.targetType.set(value as ModerationTargetType | '');
  }

  protected name(account: ModerationAccountRef): string {
    return account.deleted ? 'Deleted account' : account.nickname || account.username;
  }

  protected readonly actionLabels = ACTION_LABELS;
  protected readonly reasonLabels = REASON_LABELS;
  protected readonly typeLabels = TARGET_TYPE_LABELS;
  protected readonly actionChip = actionChip;
  protected readonly dayTime = dayTime;
  protected readonly panelError = panelError;
}
