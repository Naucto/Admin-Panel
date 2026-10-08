import { inject, Injectable } from '@angular/core';

import { ApiService } from './api.service';
import type {
  Breakdown,
  Funnel,
  Games,
  GameSort,
  Grain,
  Health,
  Live,
  MetricsResponse,
  Overview,
  Presence,
  Retention,
  RetentionKind,
  Series,
} from './types';

export interface DayRange {
  from: string;
  to: string;
}

/** The backend's `admin/analytics/*` routes. */
@Injectable({ providedIn: 'root' })
export class AnalyticsApi {
  private readonly api = inject(ApiService);
  private metricsRequest: Promise<MetricsResponse> | null = null;

  /** The registry never changes while the panel is open, so it is asked for once. */
  metrics(): Promise<MetricsResponse> {
    this.metricsRequest ??= this.api
      .get<MetricsResponse>('/admin/analytics/metrics')
      .catch((error: unknown) => {
        this.metricsRequest = null;
        throw error;
      });
    return this.metricsRequest;
  }

  series(metric: string, grain: Grain, range: DayRange, dimension?: string): Promise<Series> {
    return this.api.get('/admin/analytics/timeseries', { metric, grain, ...range, dimension });
  }

  /** Several metrics over the same periods, by metric name. */
  async seriesSet(
    metrics: readonly string[],
    grain: Grain,
    range: DayRange,
  ): Promise<Record<string, Series>> {
    const all = await Promise.all(metrics.map((metric) => this.series(metric, grain, range)));
    return Object.fromEntries(all.map((series) => [series.metric, series]));
  }

  overview(grain: Grain, day: string): Promise<Overview> {
    return this.api.get('/admin/analytics/overview', { grain, day });
  }

  breakdown(metric: string, dimension: string, grain: Grain, day: string): Promise<Breakdown> {
    return this.api.get('/admin/analytics/breakdown', { metric, dimension, grain, day });
  }

  live(): Promise<Live> {
    return this.api.get('/admin/analytics/live');
  }

  presence(from: string, to: string): Promise<Presence> {
    return this.api.get('/admin/analytics/presence', { from, to });
  }

  retention(kind: RetentionKind, range: DayRange): Promise<Retention> {
    return this.api.get('/admin/analytics/retention', { kind, ...range });
  }

  funnel(range: DayRange): Promise<Funnel> {
    return this.api.get('/admin/analytics/funnel', { ...range });
  }

  games(grain: Grain, day: string, sort: GameSort, page: number, limit = 10): Promise<Games> {
    return this.api.get('/admin/analytics/games', { grain, day, sort, page, limit });
  }

  health(): Promise<Health> {
    return this.api.get('/admin/analytics/health');
  }
}
