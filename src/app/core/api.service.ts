import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { ApiError } from './api-error';
import { API_BASE, AuthStore } from './auth.store';

type Query = Record<string, string | number | undefined>;

/** Authenticated calls to the Naucto API; one renewal and retry when the access token has lapsed. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  get<T>(path: string, query: Query = {}): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  private async request<T>(
    method: string,
    path: string,
    options: { query?: Query; body?: unknown },
    retried = false,
  ): Promise<T> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    const search = params.size > 0 ? `?${params.toString()}` : '';
    const headers: Record<string, string> = {};
    const token = this.auth.token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_BASE}${path}${search}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
    });

    if (response.status === 401 && !retried) {
      if (await this.auth.renew()) {
        return this.request<T>(method, path, options, true);
      }
      this.auth.signOutLocally();
      void this.router.navigate(['/login'], { queryParams: { expired: 1 } });
    }
    if (!response.ok) {
      throw await ApiError.from(response);
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }
}
