import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type { CrashDetail, CrashGroup, CrashList, CrashQuery, CrashStatus } from './types';

/** The backend's `admin/crashes*` routes: crashes grouped by fingerprint. */
@Injectable({ providedIn: 'root' })
export class CrashesApi {
  private readonly api = inject(ApiService);

  crashes(query: CrashQuery): Promise<CrashList> {
    return this.api.get('/admin/crashes', { ...query });
  }

  crash(id: number): Promise<CrashDetail> {
    return this.api.get(`/admin/crashes/${id}`);
  }

  setStatus(id: number, status: CrashStatus): Promise<CrashGroup> {
    return this.api.put(`/admin/crashes/${id}`, { status });
  }
}
