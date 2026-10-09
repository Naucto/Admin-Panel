import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  resource,
  signal,
} from '@angular/core';

import { AccountsApi } from '../../core/accounts.api';
import { errorMessage } from '../../core/api-error';
import { AuthStore } from '../../core/auth.store';
import { longDay, utcDay } from '../../core/dates';
import type { AccountSummary } from '../../core/types';
import { FeedbackService } from '../../ui/feedback.service';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';

const SEARCH_DELAY_MS = 250;

/**
 * Who administers Naucto. Admins are ordinary Naucto accounts holding the admin role: one is added
 * by finding the account and promoting it, and removed by taking the role back.
 */
@Component({
  selector: 'ad-admins-page',
  imports: [IconComponent, PanelComponent],
  templateUrl: './admins.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AdminsPage {
  private readonly api = inject(AccountsApi);
  private readonly feedback = inject(FeedbackService);
  protected readonly auth = inject(AuthStore);

  protected readonly admins = resource({ loader: () => this.api.admins() });
  protected readonly adminsState = computed(() =>
    panelState(this.admins, (list) => list.length === 0),
  );

  protected readonly term = signal('');
  private readonly debounced = signal('');
  protected readonly results = resource({
    params: () => (this.debounced().length >= 2 ? this.debounced() : undefined),
    loader: ({ params }) => this.api.search(params),
  });
  protected readonly busy = signal<number | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }
    });
  }

  protected typeTerm(value: string): void {
    this.term.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.debounced.set(value.trim());
    }, SEARCH_DELAY_MS);
  }

  protected isMe(account: { id: number }): boolean {
    return this.auth.account()?.id === account.id;
  }

  protected async promote(account: AccountSummary): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: `Make @${account.username} an admin?`,
      message: `${account.email} will be able to sign in to this console, read every figure and add or remove admins.`,
      confirmLabel: 'Make admin',
    });
    if (confirmed) {
      await this.act(account.id, async () => {
        await this.api.setRole(account.id, 'Admin');
        this.feedback.toast(`@${account.username} is now an admin.`);
        this.term.set('');
        this.debounced.set('');
      });
    }
  }

  protected async revoke(admin: AccountSummary): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: `Remove @${admin.username} from the admins?`,
      message: `${admin.email} keeps their Naucto account but loses access to this console at once.`,
      confirmLabel: 'Remove admin role',
      danger: true,
    });
    if (confirmed) {
      await this.act(admin.id, async () => {
        await this.api.setRole(admin.id, 'User');
        this.feedback.toast(`@${admin.username} is no longer an admin.`);
      });
    }
  }

  protected since(iso: string): string {
    return longDay(utcDay(Date.parse(iso)));
  }

  private async act(id: number, action: () => Promise<void>): Promise<void> {
    this.busy.set(id);
    try {
      await action();
      this.admins.reload();
    } catch (error) {
      this.feedback.toast(errorMessage(error), 'error');
    } finally {
      this.busy.set(null);
    }
  }

  protected readonly panelError = panelError;
}
