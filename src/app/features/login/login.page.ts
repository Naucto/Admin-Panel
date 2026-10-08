import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { errorMessage } from '../../core/api-error';
import { AuthStore } from '../../core/auth.store';
import { IconComponent } from '../../ui/icon.component';
import { LogoComponent } from '../../ui/logo.component';

type Step =
  { kind: 'credentials' } | { kind: 'code'; challengeToken: string } | { kind: 'protect' };

/**
 * Signing in with a Naucto admin account: the password, then the authenticator code when the
 * account has one. An account without one is told what that risks before it goes in.
 */
@Component({
  selector: 'ad-login-page',
  imports: [IconComponent, LogoComponent],
  templateUrl: './login.page.html',
  host: { class: 'block min-h-dvh' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginPage {
  readonly next = input<string>();
  readonly expired = input<string>();

  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly step = signal<Step>({ kind: 'credentials' });
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submitCredentials(): Promise<void> {
    await this.run(async () => {
      const outcome = await this.auth.login(this.email().trim(), this.password());
      this.password.set('');
      if (outcome.kind === 'code') {
        this.code.set('');
        this.step.set({ kind: 'code', challengeToken: outcome.challengeToken });
      } else if (this.auth.needsTwoFactor()) {
        this.step.set({ kind: 'protect' });
      } else {
        await this.enter();
      }
    });
  }

  protected async submitCode(): Promise<void> {
    const step = this.step();
    if (step.kind !== 'code') {
      return;
    }
    await this.run(async () => {
      await this.auth.verifyCode(step.challengeToken, this.code());
      await this.enter();
    });
  }

  protected typeCode(value: string): void {
    this.code.set(value.replace(/\D/g, '').slice(0, 6));
    if (this.code().length === 6 && !this.busy()) {
      void this.submitCode();
    }
  }

  protected back(): void {
    this.error.set(null);
    this.code.set('');
    this.step.set({ kind: 'credentials' });
  }

  protected async setUpNow(): Promise<void> {
    await this.router.navigate(['/account'], { queryParams: { setup: 1 } });
  }

  protected async enter(): Promise<void> {
    const next = this.next();
    // Only a path inside the panel, never somewhere a crafted link names.
    const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/overview';
    await this.router.navigateByUrl(target);
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
