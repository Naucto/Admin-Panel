import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type {
  AccountSummary,
  AdminAccount,
  AdminMe,
  AdminSession,
  RoleName,
  TwoFactorSetup,
} from './types';

/** The backend's `admin/accounts/*` routes. */
@Injectable({ providedIn: 'root' })
export class AccountsApi {
  private readonly api = inject(ApiService);

  me(): Promise<AdminMe> {
    return this.api.get('/admin/accounts/me');
  }

  async admins(): Promise<AdminAccount[]> {
    return (await this.api.get<{ items: AdminAccount[] }>('/admin/accounts/admins')).items;
  }

  async search(term: string): Promise<AccountSummary[]> {
    return (await this.api.get<{ items: AccountSummary[] }>('/admin/accounts/search', { term }))
      .items;
  }

  setRole(id: number, role: RoleName): Promise<AdminAccount> {
    return this.api.put(`/admin/accounts/${id}/role`, { role });
  }

  resetTwoFactor(id: number): Promise<AdminAccount> {
    return this.api.post(`/admin/accounts/${id}/two-factor/reset`);
  }

  startTwoFactor(): Promise<TwoFactorSetup> {
    return this.api.post('/admin/accounts/me/two-factor/setup');
  }

  confirmTwoFactor(setupToken: string, code: string): Promise<AdminSession> {
    return this.api.post('/admin/accounts/me/two-factor/confirm', { setupToken, code });
  }

  disableTwoFactor(code: string): Promise<AdminMe> {
    return this.api.post('/admin/accounts/me/two-factor/disable', { code });
  }
}
