import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { toDataURL } from 'qrcode';

import { AccountsApi } from '../../core/accounts.api';
import { errorMessage } from '../../core/api-error';
import { AuthStore } from '../../core/auth.store';
import { longDay, utcDay } from '../../core/dates';
import { ThemeService } from '../../core/theme.service';
import type { TwoFactorSetup } from '../../core/types';
import { FeedbackService } from '../../ui/feedback.service';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';

type Flow =
  | { kind: 'idle' }
  | { kind: 'enrolling'; setup: TwoFactorSetup; qr: string }
  | { kind: 'disabling' };

@Component({
  selector: 'ad-account-page',
  imports: [IconComponent, PanelComponent],
  templateUrl: './account.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccountPage {
  /** Set by the sign-in prompt and the reminder banner: go straight into the setup. */
  readonly setup = input<string>();

  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  private readonly api = inject(AccountsApi);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

  protected readonly flow = signal<Flow>({ kind: 'idle' });
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly copied = signal(false);

  protected readonly account = computed(() => this.auth.account());
  protected readonly enabledSince = computed(() => {
    const at = this.account()?.twoFactorEnabledAt;
    return at ? longDay(utcDay(Date.parse(at))) : null;
  });
  protected readonly groupedSecret = computed(() => {
    const flow = this.flow();
    return flow.kind === 'enrolling' ? (flow.setup.secret.match(/.{1,4}/g) ?? []).join(' ') : '';
  });

  constructor() {
    effect(() => {
      if (this.setup() && !untracked(() => this.account()?.twoFactorEnabled)) {
        untracked(() => {
          void this.start();
        });
      }
    });
  }

  protected async start(): Promise<void> {
    if (this.flow().kind === 'enrolling') {
      return;
    }
    await this.run(async () => {
      const setup = await this.api.startTwoFactor();
      const qr = await toDataURL(setup.otpauthUri, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: 'M',
        color: { dark: '#0b0a09', light: '#ffffff' },
      });
      this.code.set('');
      this.flow.set({ kind: 'enrolling', setup, qr });
    });
  }

  protected async confirm(): Promise<void> {
    const flow = this.flow();
    if (flow.kind !== 'enrolling') {
      return;
    }
    await this.run(async () => {
      this.auth.adopt(await this.api.confirmTwoFactor(flow.setup.setupToken, this.code()), true);
      this.flow.set({ kind: 'idle' });
      this.feedback.toast('Two-factor sign-in is on. Next time, the console asks for a code.');
      if (this.setup()) {
        await this.router.navigate([], { queryParams: {} });
      }
    });
  }

  protected async disable(): Promise<void> {
    await this.run(async () => {
      this.auth.updateAccount(await this.api.disableTwoFactor(this.code()));
      this.flow.set({ kind: 'idle' });
      this.feedback.toast('Two-factor sign-in is off.', 'info');
    });
  }

  protected beginDisable(): void {
    this.code.set('');
    this.error.set(null);
    this.flow.set({ kind: 'disabling' });
  }

  protected cancel(): void {
    this.code.set('');
    this.error.set(null);
    this.flow.set({ kind: 'idle' });
  }

  protected typeCode(value: string): void {
    this.code.set(value.replace(/\D/g, '').slice(0, 6));
  }

  protected async copySecret(): Promise<void> {
    const flow = this.flow();
    if (flow.kind === 'enrolling') {
      await navigator.clipboard.writeText(flow.setup.secret);
      this.copied.set(true);
      setTimeout(() => {
        this.copied.set(false);
      }, 1_500);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
