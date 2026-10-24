import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import { toCrashDetail, toCrashGroup } from './report-views';
import type {
  AdminReportDetail,
  AdminReportList,
  CrashDetail,
  CrashGroup,
  CrashList,
  CrashQuery,
  CrashStatus,
  ReportStatus,
} from './types';

/** Reopening a crash puts it back among the ones nobody has looked at. */
const REPORT_STATUS: Record<CrashStatus, ReportStatus> = {
  OPEN: 'NEW',
  RESOLVED: 'RESOLVED',
  IGNORED: 'IGNORED',
};

/** Crashes, one report per message, read from the backend's `admin/reports` routes. */
@Injectable({ providedIn: 'root' })
export class CrashesApi {
  private readonly api = inject(ApiService);

  async crashes(query: CrashQuery): Promise<CrashList> {
    const { status, ...rest } = query;
    const list = await this.api.get<AdminReportList>('/admin/reports', {
      ...rest,
      kind: 'CRASH',
      ...(status === 'OPEN' ? { view: 'OPEN' } : status ? { status } : {}),
    });
    return { ...list, items: list.items.map(toCrashGroup) };
  }

  async crash(id: number): Promise<CrashDetail> {
    return toCrashDetail(await this.api.get<AdminReportDetail>(`/admin/reports/${id}`));
  }

  async setStatus(id: number, status: CrashStatus): Promise<CrashGroup> {
    return toCrashGroup(
      await this.api.put<AdminReportDetail>(`/admin/reports/${id}`, {
        status: REPORT_STATUS[status],
      }),
    );
  }
}
