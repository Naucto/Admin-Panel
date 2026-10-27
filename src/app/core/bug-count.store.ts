import { inject, Injectable, signal } from '@angular/core';

import { UserFeedbackApi } from './user-feedback.api';

/** How many bug reports nobody has looked at yet, for the badge in the sidebar. */
@Injectable({ providedIn: 'root' })
export class BugCountStore {
  private readonly api = inject(UserFeedbackApi);

  readonly count = signal(0);

  async refresh(): Promise<void> {
    try {
      this.count.set(await this.api.newBugCount());
    } catch {
      // The badge keeps its last count: the Bug reports page says what went wrong.
    }
  }
}
