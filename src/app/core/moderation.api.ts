import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type {
  CaseSort,
  CaseSummary,
  CaseView,
  ModerationReason,
  ModerationTargetType,
  OpenCaseCount,
  Page,
} from './types';

export interface CaseQuery {
  view: CaseView;
  targetType?: ModerationTargetType;
  reason?: ModerationReason;
  sort: CaseSort;
  page: number;
  limit: number;
}

/** What users reported and what staff did about it, from the backend's `admin/moderation` routes. */
@Injectable({ providedIn: 'root' })
export class ModerationApi {
  private readonly api = inject(ApiService);

  cases(query: CaseQuery): Promise<Page<CaseSummary>> {
    return this.api.get('/admin/moderation/cases', { ...query });
  }

  openCaseCount(): Promise<OpenCaseCount> {
    return this.api.get('/admin/moderation/cases/count');
  }
}
