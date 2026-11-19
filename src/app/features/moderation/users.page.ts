import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { longDay, utcDay } from '../../core/dates';
import { ModerationApi } from '../../core/moderation.api';
import {
  panelRoute,
  STANDING_LABELS,
  standingChip,
  suspensionLabel,
} from '../../core/moderation-format';
import { roleLabel } from '../../core/roles';
import type { AccountStanding, ModerationAccount } from '../../core/types';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { PagerComponent } from '../../ui/pager.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SearchBoxComponent } from '../../ui/search-box.component';
import { SegmentedComponent } from '../../ui/segmented.component';

const PAGE_SIZE = 25;

type StandingFilter = AccountStanding | 'ALL';

/** Every Naucto account, with where it stands and how much was reported about it. */
@Component({
  selector: 'nc-users-page',
  imports: [
    AccountCellComponent,
    PagerComponent,
    PanelComponent,
    SearchBoxComponent,
    SegmentedComponent,
  ],
  templateUrl: './users.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UsersPage {
  private readonly api = inject(ModerationApi);
  private readonly router = inject(Router);

  protected readonly standings: { value: StandingFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'WARNED', label: 'Warned' },
    { value: 'SUSPENDED', label: 'Suspended' },
  ];
  protected readonly search = signal('');
  protected readonly standing = signal<StandingFilter>('ALL');
  protected readonly page = linkedSignal({
    source: () => ({ search: this.search(), standing: this.standing() }),
    computation: () => 1,
  });

  protected readonly accounts = resource({
    params: () => {
      const standing = this.standing();
      return {
        search: this.search() || undefined,
        standing: standing === 'ALL' ? undefined : standing,
        page: this.page(),
        limit: PAGE_SIZE,
      };
    },
    loader: ({ params }) => this.api.accounts(params),
  });
  protected readonly accountsState = computed(() =>
    panelState(this.accounts, (value) => value.items.length === 0),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.accounts.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly hint = computed(() => {
    const total = this.accounts.value()?.total;
    return total === undefined ? '' : `${total} ${total === 1 ? 'account' : 'accounts'}`;
  });

  protected open(account: ModerationAccount): void {
    const route = panelRoute('USER', account.id);
    if (route) {
      void this.router.navigate(route);
    }
  }

  protected standingTitle(account: ModerationAccount): string {
    return account.suspension ? suspensionLabel(account.suspension) : '';
  }

  protected joined(iso: string): string {
    return longDay(utcDay(Date.parse(iso)));
  }

  protected readonly standingLabels = STANDING_LABELS;
  protected readonly standingChip = standingChip;
  protected readonly roleLabel = roleLabel;
  protected readonly panelError = panelError;
}
