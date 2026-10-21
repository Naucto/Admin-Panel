import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type {
  Activity,
  Arrivals,
  Marker,
  MarkerInput,
  Release,
  Timeline,
  TimelineBucket,
  TimelineMetric,
  TimelineSource,
} from './types';

export interface InstantRange {
  /** Epoch milliseconds. */
  from: number;
  /** Epoch milliseconds, excluded. */
  to: number;
}

export interface TimelineFilters {
  releaseId?: number | null;
  /** As `referrer:youtube.com`. */
  source?: string | null;
}

const iso = (at: number): string => new Date(at).toISOString();

/** The backend's raw timeline, its activity feed, arrivals and the markers on the charts. */
@Injectable({ providedIn: 'root' })
export class TimelineApi {
  private readonly api = inject(ApiService);

  timeline(
    range: InstantRange,
    bucket: TimelineBucket,
    metrics: readonly TimelineMetric[],
    filters: TimelineFilters = {},
  ): Promise<Timeline> {
    return this.api.get('/admin/analytics/timeline', {
      from: iso(range.from),
      to: iso(range.to),
      bucket,
      metrics: metrics.join(','),
      releaseId: filters.releaseId ?? undefined,
      source: filters.source ?? undefined,
    });
  }

  async sources(range: InstantRange): Promise<TimelineSource[]> {
    const answer = await this.api.get<{ sources: TimelineSource[] }>('/admin/analytics/sources', {
      from: iso(range.from),
      to: iso(range.to),
    });
    return answer.sources;
  }

  activity(range: InstantRange, limit = 200): Promise<Activity> {
    return this.api.get('/admin/analytics/activity', {
      from: iso(range.from),
      to: iso(range.to),
      limit,
    });
  }

  arrivals(range: InstantRange, source?: string | null, limit = 100): Promise<Arrivals> {
    return this.api.get('/admin/analytics/arrivals', {
      from: iso(range.from),
      to: iso(range.to),
      source: source ?? undefined,
      limit,
    });
  }

  /** Published games by part of their name or their id (`12`, `#12`), a few at a time. */
  async searchReleases(query: string, limit = 8): Promise<Release[]> {
    const answer = await this.api.get<{ releases: Release[] }>('/admin/analytics/releases', {
      query,
      limit,
    });
    return answer.releases;
  }

  /** The names of projects by id, published or not. */
  async releasesByIds(ids: readonly number[]): Promise<Release[]> {
    if (ids.length === 0) {
      return [];
    }
    const answer = await this.api.get<{ releases: Release[] }>('/admin/analytics/releases', {
      ids: ids.join(','),
    });
    return answer.releases;
  }

  async markers(range?: InstantRange): Promise<Marker[]> {
    const answer = await this.api.get<{ markers: Marker[] }>(
      '/admin/analytics/markers',
      range ? { from: iso(range.from), to: iso(range.to) } : {},
    );
    return answer.markers;
  }

  createMarker(marker: MarkerInput): Promise<Marker> {
    return this.api.post('/admin/analytics/markers', marker);
  }

  updateMarker(id: number, marker: Partial<MarkerInput>): Promise<Marker> {
    return this.api.patch(`/admin/analytics/markers/${String(id)}`, marker);
  }

  deleteMarker(id: number): Promise<void> {
    return this.api.delete(`/admin/analytics/markers/${String(id)}`);
  }
}
