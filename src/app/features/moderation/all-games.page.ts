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
import { Router, RouterLink } from '@angular/router';

import { dayTime, shortAgo } from '../../core/dates';
import { idOf } from '../../core/ids';
import { ModerationApi } from '../../core/moderation.api';
import { PROJECT_STATE_LABELS, projectStateChip } from '../../core/moderation-format';
import { optionsOf } from '../../core/support-format';
import type { ModerationProject, ProjectModerationState } from '../../core/types';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { IconComponent } from '../../ui/icon.component';
import { PagerComponent } from '../../ui/pager.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SearchBoxComponent } from '../../ui/search-box.component';
import { SegmentedComponent } from '../../ui/segmented.component';

const PAGE_SIZE = 25;

type StateFilter = ProjectModerationState | 'ALL';

/** Every game on Naucto, published or not, with where it stands. */
@Component({
  selector: 'nc-all-games-page',
  imports: [
    AccountCellComponent,
    IconComponent,
    PagerComponent,
    PanelComponent,
    RouterLink,
    SearchBoxComponent,
    SegmentedComponent,
  ],
  templateUrl: './all-games.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AllGamesPage {
  private readonly api = inject(ModerationApi);
  private readonly router = inject(Router);

  /** `?creator=`: only the games of one account, as the account page links here. */
  readonly creator = input(undefined, { transform: idOf });

  protected readonly states: { value: StateFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    ...optionsOf(PROJECT_STATE_LABELS),
  ];
  protected readonly search = signal('');
  protected readonly state = signal<StateFilter>('ALL');
  protected readonly page = linkedSignal({
    source: () => ({ search: this.search(), state: this.state(), creator: this.creator() }),
    computation: () => 1,
  });

  protected readonly games = resource({
    params: () => {
      const state = this.state();
      return {
        search: this.search() || undefined,
        state: state === 'ALL' ? undefined : state,
        creatorId: this.creator(),
        page: this.page(),
        limit: PAGE_SIZE,
      };
    },
    loader: ({ params }) => this.api.projects(params),
  });
  protected readonly gamesState = computed(() =>
    panelState(this.games, (value) => value.items.length === 0),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.games.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly hint = computed(() => {
    const total = this.games.value()?.total;
    return total === undefined ? '' : `${total} ${total === 1 ? 'game' : 'games'}`;
  });

  protected open(game: ModerationProject): void {
    void this.router.navigate(['/moderation/games', game.id]);
  }

  protected readonly stateLabels = PROJECT_STATE_LABELS;
  protected readonly projectStateChip = projectStateChip;
  protected readonly dayTime = dayTime;
  protected readonly shortAgo = shortAgo;
  protected readonly panelError = panelError;
}
