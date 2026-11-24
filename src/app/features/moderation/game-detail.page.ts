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
import { dayTime } from '../../core/dates';
import { ModerationApi } from '../../core/moderation.api';
import {
  bearsOnAccount,
  caseRoute,
  PROJECT_STATE_LABELS,
  projectStateChip,
} from '../../core/moderation-format';
import type { ModerationOperation } from '../../core/types';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { HistoryListComponent } from '../../ui/history-list.component';
import { IconComponent } from '../../ui/icon.component';
import { objectUrl } from '../../ui/object-url';
import { OperationButtonsComponent } from '../../ui/operation-buttons.component';
import { PagerComponent } from '../../ui/pager.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { ShortIdComponent } from '../../ui/short-id.component';
import { ModerationActions } from './moderation-actions.service';

const HISTORY_PAGE_SIZE = 10;

/** One game: what it says about itself, where it stands, and what staff did and may do about it. */
@Component({
  selector: 'nc-game-detail-page',
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
  templateUrl: './game-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GameDetailPage {
  private readonly api = inject(ModerationApi);
  private readonly router = inject(Router);
  protected readonly actions = inject(ModerationActions);
  protected readonly auth = inject(AuthStore);

  /** The `:id` of the route. */
  readonly id = input.required<string>();

  protected readonly game = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.project(params),
  });
  protected readonly gameState = computed(() => panelState(this.game, () => false));

  protected readonly cover = objectUrl(
    () => {
      const game = this.game.value();
      return game?.hasCover ? game.id : undefined;
    },
    (id) => this.api.projectCover(id),
  );

  protected readonly clip = objectUrl(
    () => {
      const game = this.game.value();
      return game?.hasClip ? game.id : undefined;
    },
    (id) => this.api.projectClip(id),
  );

  protected readonly historyPage = linkedSignal({ source: () => this.id(), computation: () => 1 });
  protected readonly history = resource({
    params: () => ({
      targetType: 'PROJECT' as const,
      targetId: this.id(),
      page: this.historyPage(),
      limit: HISTORY_PAGE_SIZE,
    }),
    loader: ({ params }) => this.api.log(params),
  });
  protected readonly historyState = computed(() =>
    panelState(this.history, (value) => value.items.length === 0),
  );
  protected readonly historyPages = computed(() =>
    Math.max(1, Math.ceil((this.history.value()?.total ?? 0) / HISTORY_PAGE_SIZE)),
  );

  protected readonly operations = computed(() =>
    (this.game.value()?.allowedActions ?? []).filter((operation) => !bearsOnAccount(operation)),
  );

  /** Who else works on the game: the owner already has a panel. */
  protected readonly collaborators = computed(() => {
    const found = this.game.value();
    return found ? found.collaborators.filter((account) => account.id !== found.owner.id) : [];
  });

  protected async run(operation: ModerationOperation): Promise<void> {
    const found = this.game.value();
    if (!found) {
      return;
    }
    const done = await this.actions.run(operation, {
      type: 'PROJECT',
      id: found.id,
      label: found.name,
      owner: found.owner,
      openFlags: found.openFlags,
      reasons: [],
    });
    if (!done) {
      return;
    }
    if (operation === 'DELETE') {
      await this.router.navigate(['/moderation/games']);
      return;
    }
    this.game.reload();
    this.history.reload();
  }

  protected readonly caseRoute = caseRoute;
  protected readonly stateLabels = PROJECT_STATE_LABELS;
  protected readonly projectStateChip = projectStateChip;
  protected readonly dayTime = dayTime;
  protected readonly panelError = panelError;
}
