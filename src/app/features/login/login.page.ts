import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { errorMessage } from '../../core/api-error';
import { AuthStore } from '../../core/auth.store';
import { LogoComponent } from '../../ui/logo.component';

/** Signing in with a Naucto admin account. */
@Component({
  selector: 'nc-login-page',
  imports: [LogoComponent],
  templateUrl: './login.page.html',
  host: { class: 'block min-h-dvh' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginPage {
  readonly next = input<string>();
  readonly expired = input<string>();

  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /**
   * Reads the fields as they are on submit: a browser that fills saved credentials in does not
   * report them as input until the page is interacted with.
   */
  protected async submit(form: HTMLFormElement): Promise<void> {
    const fields = new FormData(form);
    const email = String(fields.get('email') ?? '').trim();
    const password = String(fields.get('password') ?? '');
    if (!email || !password) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login(email, password);
      const next = this.next();
      // Only a path inside the panel, never somewhere a crafted link names.
      const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/overview';
      await this.router.navigateByUrl(target);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
