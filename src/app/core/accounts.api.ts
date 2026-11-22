import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type { AccountSummary, RoleName } from './types';

/** The backend's `admin/accounts/*` routes. */
@Injectable({ providedIn: 'root' })
export class AccountsApi {
  private readonly api = inject(ApiService);

  /** Everyone holding a role that signs in to the console. */
  async staff(): Promise<AccountSummary[]> {
    return (await this.api.get<{ items: AccountSummary[] }>('/admin/accounts/staff')).items;
  }

  async search(term: string): Promise<AccountSummary[]> {
    return (await this.api.get<{ items: AccountSummary[] }>('/admin/accounts/search', { term }))
      .items;
  }

  setRole(id: number, role: RoleName): Promise<AccountSummary> {
    return this.api.put(`/admin/accounts/${id}/role`, { role });
  }
}
