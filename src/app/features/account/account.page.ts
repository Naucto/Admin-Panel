import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../../core/auth.store';
import { ThemeService } from '../../core/theme.service';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';

@Component({
  selector: 'nc-account-page',
  imports: [IconComponent, PanelComponent],
  templateUrl: './account.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccountPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);
  protected readonly account = this.auth.account;

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
