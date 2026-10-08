import { computed, Injectable, signal } from '@angular/core';

import { ApiError } from './api-error';
import type { AdminAccount, AdminMe, AdminSession } from './types';

/** Where the dev server and the production nginx both forward to the Naucto API. */
export const API_BASE = '/api';

/** Renew this long before the access token runs out, so a request never meets an expired one. */
const RENEW_MARGIN_MS = 60_000;

export type AuthStatus = 'booting' | 'signed-out' | 'signed-in';

export type LoginOutcome = { kind: 'signed-in' } | { kind: 'code'; challengeToken: string };

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
    account: AdminMe | null;
  }>({ status: 'booting', token: null, account: null });
  private renewTimer: ReturnType<typeof setTimeout> | null = null;
  private renewing: Promise<boolean> | null = null;

  readonly status = computed(() => this.state().status);
  readonly account = computed(() => this.state().account);
  readonly token = computed(() => this.state().token);
  /** An admin signing in with a password alone, which the shell keeps reminding them of. */
  readonly needsTwoFactor = computed(() => {
    const account = this.state().account;
    return account !== null && !account.twoFactorEnabled;
  });

  /** Picks the session back up from the cookie, if there still is one. */
  async boot(): Promise<void> {
    if (!(await this.renew())) {
      this.state.set({ status: 'signed-out', token: null, account: null });
    }
  }

  async login(email: string, password: string): Promise<LoginOutcome> {
    const session = await post<AdminSession>('/admin/auth/login', { email, password });
    if (session.status === 'two_factor_required' && session.challengeToken) {
      return { kind: 'code', challengeToken: session.challengeToken };
    }
    this.adopt(session, false);
    return { kind: 'signed-in' };
  }

  async verifyCode(challengeToken: string, code: string): Promise<void> {
    this.adopt(await post<AdminSession>('/admin/auth/two-factor', { challengeToken, code }), true);
  }

  /** Takes on a session the API issued, as after turning two-factor sign-in on. */
  adopt(session: AdminSession, verified: boolean): void {
    if (!session.accessToken || !session.account) {
      throw new Error('The API answered without a session');
    }
    this.state.set({
      status: 'signed-in',
      token: session.accessToken,
      account: { ...session.account, sessionVerified: verified },
    });
    this.scheduleRenewal(session.expiresIn ?? 900);
  }

  updateAccount(account: AdminAccount | AdminMe): void {
    this.state.update((current) =>
      current.account ? { ...current, account: { ...current.account, ...account } } : current,
    );
  }

  /** A new access token from the session cookie; false when the session is over. */
  renew(): Promise<boolean> {
    this.renewing ??= post<AdminSession>('/admin/auth/refresh')
      .then((session) => {
        // The API renews a session of a two-factor account only if it passed the code step.
        this.adopt(session, session.account?.twoFactorEnabled ?? false);
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
