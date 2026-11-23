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

import { AuthStore } from '../../core/auth.store';
import { dayTime, shortAgo } from '../../core/dates';
import { idOf } from '../../core/ids';
import { ModerationApi } from '../../core/moderation.api';
import {
  bearsOnAccount,
  caseRoute,
  COMMENT_STATE_LABELS,
  commentStateChip,
} from '../../core/moderation-format';
import { optionsOf } from '../../core/support-format';
import type {
  CommentModerationState,
  ModerationComment,
  ModerationOperation,
} from '../../core/types';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { HistoryListComponent } from '../../ui/history-list.component';
import { IconComponent } from '../../ui/icon.component';
import { OperationButtonsComponent } from '../../ui/operation-buttons.component';
import { PagerComponent } from '../../ui/pager.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SearchBoxComponent } from '../../ui/search-box.component';
import { SegmentedComponent } from '../../ui/segmented.component';
import { ShortIdComponent } from '../../ui/short-id.component';
import { ModerationActions } from './moderation-actions.service';

const PAGE_SIZE = 25;
const HISTORY_SIZE = 20;

type StateFilter = CommentModerationState | 'ALL';

/** Every comment on Naucto, newest first. A row opens under the list with what staff did about it. */
@Component({
  selector: 'nc-comments-page',
  imports: [
    AccountCellComponent,
    HistoryListComponent,
    IconComponent,
    OperationButtonsComponent,
    PagerComponent,
    PanelComponent,
    RouterLink,
    SearchBoxComponent,
    SegmentedComponent,
    ShortIdComponent,
  ],
  templateUrl: './comments.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CommentsPage {
  private readonly api = inject(ModerationApi);
  protected readonly actions = inject(ModerationActions);
  protected readonly auth = inject(AuthStore);

  /** `?author=` and `?game=`: the comments of one account or on one game. */
  readonly author = input(undefined, { transform: idOf });
  readonly game = input(undefined, { transform: idOf });

  protected readonly states: { value: StateFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    ...optionsOf(COMMENT_STATE_LABELS),
  ];
  protected readonly search = signal('');
  protected readonly state = signal<StateFilter>('ALL');
  protected readonly page = linkedSignal({
    source: () => ({
      search: this.search(),
      state: this.state(),
      author: this.author(),
      game: this.game(),
    }),
    computation: () => 1,
  });

  protected readonly comments = resource({
    params: () => {
      const state = this.state();
      return {
        search: this.search() || undefined,
        state: state === 'ALL' ? undefined : state,
        authorId: this.author(),
        projectId: this.game(),
        page: this.page(),
        limit: PAGE_SIZE,
      };
    },
    loader: ({ params }) => this.api.comments(params),
  });
  protected readonly commentsState = computed(() =>
    panelState(this.comments, (value) => value.items.length === 0),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.comments.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly hint = computed(() => {
    const total = this.comments.value()?.total;
    return total === undefined ? '' : `${total} ${total === 1 ? 'comment' : 'comments'}`;
  });

  private readonly selectedId = signal<string | null>(null);
  /** The open row as the list holds it now, so a decision shows on it once the list reloads. */
  protected readonly selected = computed(
    () => this.comments.value()?.items.find((comment) => comment.id === this.selectedId()) ?? null,
  );

  protected readonly history = resource({
    params: () => {
      const comment = this.selected();
      return comment
        ? { targetType: 'COMMENT' as const, targetId: comment.id, page: 1, limit: HISTORY_SIZE }
        : undefined;
    },
    loader: ({ params }) => this.api.log(params),
  });
  protected readonly historyState = computed(() => panelState(this.history, () => false));

  protected toggle(comment: ModerationComment): void {
    this.selectedId.set(this.selectedId() === comment.id ? null : comment.id);
  }

  protected close(): void {
    this.selectedId.set(null);
  }

  protected operations(comment: ModerationComment): ModerationOperation[] {
    return comment.allowedActions.filter((operation) => !bearsOnAccount(operation));
  }

  protected async run(operation: ModerationOperation, comment: ModerationComment): Promise<void> {
    const done = await this.actions.run(operation, {
      type: 'COMMENT',
      id: comment.id,
      label: comment.content,
      owner: comment.author,
      openFlags: comment.openFlags,
      reasons: [],
    });
    if (done) {
      this.comments.reload();
      this.history.reload();
    }
  }

  protected readonly caseRoute = caseRoute;
  protected readonly stateLabels = COMMENT_STATE_LABELS;
  protected readonly commentStateChip = commentStateChip;
  protected readonly dayTime = dayTime;
  protected readonly shortAgo = shortAgo;
  protected readonly panelError = panelError;
}
