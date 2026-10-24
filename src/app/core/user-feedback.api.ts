import { inject, Injectable } from '@angular/core';

import type { DayRange } from './analytics.api';
import { ApiService } from './api.service';
import { toBugDetail, toBugSummary, toRating } from './report-views';
import type {
  AdminReportDetail,
  AdminReportList,
  BugCategory,
  BugDetail,
  BugList,
  BugUpdate,
  BugView,
  Grain,
  RatingList,
  RatingQuery,
  RatingSummary,
} from './types';

/** Platform ratings and bug reports, read from the backend's `admin/reports` routes. */
@Injectable({ providedIn: 'root' })
export class UserFeedbackApi {
  private readonly api = inject(ApiService);

  async ratings(query: RatingQuery): Promise<RatingList> {
    const list = await this.api.get<AdminReportList>('/admin/reports', {
      ...query,
      kind: 'RATING',
      withComments: query.withComments ? 'true' : undefined,
    });
    return { ...list, items: list.items.map(toRating) };
  }

  ratingSummary(range: DayRange, grain: Grain): Promise<RatingSummary> {
    return this.api.get('/admin/reports/ratings/summary', { ...range, grain });
  }

  async bugs(
    view: BugView,
    category: BugCategory | undefined,
    page: number,
    limit = 20,
  ): Promise<BugList> {
    const list = await this.api.get<AdminReportList>('/admin/reports', {
      kind: 'BUG',
      view,
      category,
      page,
      limit,
    });
    return { ...list, items: list.items.map(toBugSummary) };
  }

  async newBugCount(): Promise<number> {
    return (
      await this.api.get<{ count: number }>('/admin/reports/count', { kind: 'BUG', status: 'NEW' })
    ).count;
  }

  async bug(id: number): Promise<BugDetail> {
    return toBugDetail(await this.api.get<AdminReportDetail>(`/admin/reports/${id}`));
  }

  async updateBug(id: number, update: BugUpdate): Promise<BugDetail> {
    return toBugDetail(await this.api.put<AdminReportDetail>(`/admin/reports/${id}`, update));
  }

  screenshot(id: number): Promise<Blob> {
    return this.api.getBlob(`/admin/reports/${id}/screenshot`);
  }
}
