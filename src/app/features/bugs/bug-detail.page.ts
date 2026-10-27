import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { errorMessage } from '../../core/api-error';
import { BugCountStore } from '../../core/bug-count.store';
import { dayTime } from '../../core/dates';
import {
  BUG_CATEGORY_LABELS,
  BUG_STATUS_LABELS,
  bugContextRows,
  bugStatusChip,
  formatBytes,
  optionsOf,
  scoreChip,
} from '../../core/support-format';
import type { BugStatus } from '../../core/types';
import { UserFeedbackApi } from '../../core/user-feedback.api';
import { AccountCellComponent } from '../../ui/account-cell.component';
import { FeedbackService } from '../../ui/feedback.service';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';

const ADMIN_NOTE_MAX = 2000;

/** One bug report with everything it carried, and where the team sets its status and note. */
@Component({
  selector: 'nc-bug-detail-page',
  imports: [AccountCellComponent, IconComponent, PanelComponent, RouterLink],
  templateUrl: './bug-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BugDetailPage {
  private readonly api = inject(UserFeedbackApi);
  private readonly feedback = inject(FeedbackService);
  private readonly bugCount = inject(BugCountStore);

  /** The `:id` of the route. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly bug = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.bug(params),
  });
  protected readonly bugState = computed(() => panelState(this.bug, () => false));

  protected readonly screenshot = resource({
    params: () => {
      const bug = this.bug.value();
      return bug?.screenshot ? bug.id : undefined;
    },
    loader: async ({ params, abortSignal }) => {
      const image = await this.api.screenshot(params);
      abortSignal.throwIfAborted();
      return URL.createObjectURL(image);
    },
  });

  protected readonly contextRows = computed(() => {
    const bug = this.bug.value();
    return bug ? bugContextRows(bug) : [];
  });
  protected readonly consoleText = computed(() => {
    const lines = this.bug.value()?.context.console;
    return Array.isArray(lines) && lines.length > 0 ? lines.join('\n') : '';
  });

  protected readonly statuses = optionsOf(BUG_STATUS_LABELS);
  protected readonly status = linkedSignal<BugStatus>(() => this.bug.value()?.status ?? 'NEW');
  protected readonly note = linkedSignal(() => this.bug.value()?.adminNote ?? '');
  protected readonly saving = signal(false);
  protected readonly changed = computed(() => {
    const bug = this.bug.value();
    return !!bug && (this.status() !== bug.status || this.note().trim() !== (bug.adminNote ?? ''));
  });

  constructor() {
    effect((onCleanup) => {
      const url = this.screenshot.value();
      if (url) {
        onCleanup(() => {
          URL.revokeObjectURL(url);
        });
      }
    });
  }

  protected setStatus(value: string): void {
    this.status.set(value as BugStatus);
  }

  protected async save(): Promise<void> {
    const bug = this.bug.value();
    if (!bug) {
      return;
    }
    this.saving.set(true);
    try {
      await this.api.updateBug(bug.id, {
        status: this.status(),
        adminNote: this.note().trim() || null,
      });
      this.feedback.toast('Saved');
      this.bug.reload();
      void this.bugCount.refresh();
    } catch (error) {
      this.feedback.toast(errorMessage(error), 'error');
    } finally {
      this.saving.set(false);
    }
  }

  protected readonly noteMax = ADMIN_NOTE_MAX;
  protected readonly categoryLabels = BUG_CATEGORY_LABELS;
  protected readonly statusLabels = BUG_STATUS_LABELS;
  protected readonly bugStatusChip = bugStatusChip;
  protected readonly scoreChip = scoreChip;
  protected readonly formatBytes = formatBytes;
  protected readonly dayTime = dayTime;
  protected readonly panelError = panelError;
}
