import { computed, Injectable, signal } from '@angular/core';

import { ApiError } from './api-error';
import type { AccountSummary, AdminSession } from './types';

/** Where the dev server and the production nginx both forward to the Naucto API. */
export const API_BASE = '/api';

/** Renew this long before the access token runs out, so a request never meets an expired one. */
const RENEW_MARGIN_MS = 60_000;

export type AuthStatus = 'booting' | 'signed-out' | 'signed-in';

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw await ApiError.from(response);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/**
 * The admin session. The access token lives in memory only; the httpOnly session cookie the API
 * sets is what brings it back after a reload, until the session's eight hours are up.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly state = signal<{
    status: AuthStatus;
    token: string | null;
    account: AccountSummary | null;
  }>({ status: 'booting', token: null, account: null });
  private renewTimer: ReturnType<typeof setTimeout> | null = null;
  private renewing: Promise<boolean> | null = null;

  readonly status = computed(() => this.state().status);
  readonly account = computed(() => this.state().account);
  readonly token = computed(() => this.state().token);

  /** Picks the session back up from the cookie, if there still is one. */
  async boot(): Promise<void> {
    if (!(await this.renew())) {
      this.state.set({ status: 'signed-out', token: null, account: null });
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.adopt(await post<AdminSession>('/admin/auth/login', { email, password }));
  }

  /** A new access token from the session cookie; false when there is no session, or it is over. */
  renew(): Promise<boolean> {
    this.renewing ??= post<AdminSession | undefined>('/admin/auth/refresh')
      .then((session) => {
        if (!session) {
          return false;
        }
        this.adopt(session);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        this.renewing = null;
      });
    return this.renewing;
  }

  async logout(): Promise<void> {
    try {
      await post<void>('/admin/auth/logout');
    } finally {
      this.signOutLocally();
    }
  }

  signOutLocally(): void {
    if (this.renewTimer) {
      clearTimeout(this.renewTimer);
      this.renewTimer = null;
    }
    this.state.set({ status: 'signed-out', token: null, account: null });
  }

  private adopt(session: AdminSession): void {
    this.state.set({ status: 'signed-in', token: session.accessToken, account: session.account });
    this.scheduleRenewal(session.expiresIn);
  }

  private scheduleRenewal(expiresInSeconds: number): void {
    if (this.renewTimer) {
      clearTimeout(this.renewTimer);
    }
    const delay = Math.max(5_000, expiresInSeconds * 1000 - RENEW_MARGIN_MS);
    this.renewTimer = setTimeout(() => {
      void this.renew().then((ok) => {
        if (!ok) {
          this.signOutLocally();
        }
      });
    }, delay);
  }
}
