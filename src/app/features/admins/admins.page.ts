import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';

import { AccountsApi } from '../../core/accounts.api';
import { errorMessage } from '../../core/api-error';
import { AuthStore } from '../../core/auth.store';
import { longDay, utcDay } from '../../core/dates';
import { roleGrant, roleLabel, STAFF_ROLES } from '../../core/roles';
import type { AccountSummary, RoleName } from '../../core/types';
import { FeedbackService } from '../../ui/feedback.service';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SearchBoxComponent } from '../../ui/search-box.component';

const ROLE_CHIPS: Record<RoleName, string> = {
  User: 'nc-chip nc-chip-quiet',
  Viewer: 'nc-chip nc-chip-quiet',
  Moderator: 'nc-chip nc-chip-ok',
  Admin: 'nc-chip nc-chip-gold',
};

/**
 * Who signs in to the console. Staff are ordinary Naucto accounts holding a role: one is added by
 * finding the account and giving it a role, and removed by taking the role back.
 */
@Component({
  selector: 'nc-admins-page',
  imports: [IconComponent, PanelComponent, SearchBoxComponent],
  templateUrl: './admins.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AdminsPage {
  private readonly api = inject(AccountsApi);
  private readonly feedback = inject(FeedbackService);
  protected readonly auth = inject(AuthStore);

  protected readonly roles = STAFF_ROLES.map((role) => ({ value: role, label: roleLabel(role) }));

  protected readonly staff = resource({ loader: () => this.api.staff() });
  protected readonly staffState = computed(() =>
    panelState(this.staff, (list) => list.length === 0),
  );
  protected readonly hint = computed(() => {
    const list = this.staff.value() ?? [];
    return STAFF_ROLES.map((role) => {
      const count = list.filter((account) => account.role === role).length;
      return `${count} ${roleLabel(role).toLowerCase()}${count === 1 ? '' : 's'}`;
    })
      .reverse()
      .join(', ');
  });

  protected readonly term = signal('');
  protected readonly results = resource({
    params: () => (this.term().length >= 2 ? this.term() : undefined),
    loader: ({ params }) => this.api.search(params),
  });
  protected readonly busy = signal<number | null>(null);

  protected isMe(account: { id: number }): boolean {
    return this.auth.account()?.id === account.id;
  }

  /** Gives a role, or takes every role back with `User`, once the admin confirmed what it means. */
  protected async give(account: AccountSummary, value: string): Promise<void> {
    const role = value as RoleName;
    if (role === account.role) {
      return;
    }
    const removing = role === 'User';
    const confirmed = await this.feedback.confirm({
      title: removing
        ? `Remove @${account.username} from the staff?`
        : `Make @${account.username} ${role === 'Admin' ? 'an admin' : `a ${roleLabel(role).toLowerCase()}`}?`,
      message: `${account.email ?? `@${account.username}`} ${roleGrant(role)}.`,
      confirmLabel: removing ? 'Remove from the staff' : `Make ${roleLabel(role).toLowerCase()}`,
      danger: removing || role === 'Admin',
    });
    if (!confirmed) {
      // A select keeps what was picked: reading the list again puts the held role back in it.
      this.staff.reload();
      return;
    }
    this.busy.set(account.id);
    try {
      await this.api.setRole(account.id, role);
      this.feedback.toast(
        removing
          ? `@${account.username} is no longer on the staff.`
          : `@${account.username} is now ${role === 'Admin' ? 'an admin' : `a ${roleLabel(role).toLowerCase()}`}.`,
      );
      this.results.reload();
    } catch (error) {
      this.feedback.toast(errorMessage(error), 'error');
    } finally {
      this.busy.set(null);
      this.staff.reload();
    }
  }

  protected since(iso: string): string {
    return longDay(utcDay(Date.parse(iso)));
  }

  protected name(account: AccountSummary): string {
    return account.nickname || account.username;
  }

  protected readonly roleChips = ROLE_CHIPS;
  protected readonly roleLabel = roleLabel;
  protected readonly panelError = panelError;
}
