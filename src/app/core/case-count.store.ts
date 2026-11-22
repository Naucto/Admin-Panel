import { inject, Injectable, signal } from '@angular/core';

import { ModerationApi } from './moderation.api';

/** How many reported targets wait for a decision, for the badge in the sidebar. */
@Injectable({ providedIn: 'root' })
export class CaseCountStore {
  private readonly api = inject(ModerationApi);

  readonly count = signal(0);

  async refresh(): Promise<void> {
    try {
      this.count.set((await this.api.openCaseCount()).openCases);
    } catch {
      // The badge keeps its last count: the Queue says what went wrong.
    }
  }
}
