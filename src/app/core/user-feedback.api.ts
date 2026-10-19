import { inject, Injectable } from '@angular/core';

import type { DayRange } from './analytics.api';
import { ApiService } from './api.service';
import type {
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

/** The backend's `admin/feedback/*` routes: platform ratings and bug reports. */
@Injectable({ providedIn: 'root' })
export class UserFeedbackApi {
  private readonly api = inject(ApiService);

  ratings(query: RatingQuery): Promise<RatingList> {
    return this.api.get('/admin/feedback/ratings', {
      ...query,
      withComments: query.withComments ? 'true' : undefined,
    });
  }

  ratingSummary(range: DayRange, grain: Grain): Promise<RatingSummary> {
    return this.api.get('/admin/feedback/ratings/summary', { ...range, grain });
  }

  bugs(
    view: BugView,
    category: BugCategory | undefined,
    page: number,
    limit = 20,
  ): Promise<BugList> {
    return this.api.get('/admin/feedback/bugs', { view, category, page, limit });
  }

  async newBugCount(): Promise<number> {
    return (await this.api.get<{ count: number }>('/admin/feedback/bugs/count')).count;
  }

  bug(id: number): Promise<BugDetail> {
    return this.api.get(`/admin/feedback/bugs/${id}`);
  }

  updateBug(id: number, update: BugUpdate): Promise<BugDetail> {
    return this.api.put(`/admin/feedback/bugs/${id}`, update);
  }

  screenshot(id: number): Promise<Blob> {
    return this.api.getBlob(`/admin/feedback/bugs/${id}/screenshot`);
  }
}
