import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type { AccountSummary, RoleName } from './types';

/** The backend's `admin/accounts/*` routes. */
@Injectable({ providedIn: 'root' })
export class AccountsApi {
  private readonly api = inject(ApiService);

  async admins(): Promise<AccountSummary[]> {
    return (await this.api.get<{ items: AccountSummary[] }>('/admin/accounts/admins')).items;
  }

  async search(term: string): Promise<AccountSummary[]> {
    return (await this.api.get<{ items: AccountSummary[] }>('/admin/accounts/search', { term }))
      .items;
  }

  setRole(id: number, role: RoleName): Promise<AccountSummary> {
    return this.api.put(`/admin/accounts/${id}/role`, { role });
  }
}
