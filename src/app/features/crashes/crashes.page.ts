import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';

import { errorMessage } from '../../core/api-error';
import { CrashesApi } from '../../core/crashes.api';
import { dayTime, shortAgo } from '../../core/dates';
import { formatCount } from '../../core/metric-catalog';
import {
  compactPairs,
  CRASH_SOURCE_LABELS,
  CRASH_STATUS_LABELS,
  crashStatusChip,
  runtimeLine,
} from '../../core/support-format';
import type { CrashGroup, CrashSort, CrashSource, CrashStatus } from '../../core/types';
import { FeedbackService } from '../../ui/feedback.service';
import { IconComponent } from '../../ui/icon.component';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { type SegmentOption, SegmentedComponent } from '../../ui/segmented.component';

type SourceFilter = 'ALL' | CrashSource;
type StatusFilter = 'ALL' | CrashStatus;

const PAGE_SIZE = 20;

const STATUS_TOASTS: Record<CrashStatus, string> = {
  OPEN: 'reopened',
  RESOLVED: 'resolved',
  IGNORED: 'ignored',
};

/** Crashes reported by the web app, the engine and the backend, grouped by fingerprint. */
@Component({
  selector: 'nc-crashes-page',
  imports: [IconComponent, PanelComponent, SegmentedComponent],
  templateUrl: './crashes.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CrashesPage {
  private readonly api = inject(CrashesApi);
  private readonly feedback = inject(FeedbackService);

  protected readonly sources: SegmentOption<SourceFilter>[] = [
    { value: 'ALL', label: 'All' },
    { value: 'WEB', label: 'Web' },
    { value: 'ENGINE', label: 'Engine' },
    { value: 'BACKEND', label: 'Backend' },
  ];
  protected readonly statuses: SegmentOption<StatusFilter>[] = [
    { value: 'OPEN', label: 'Open' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'IGNORED', label: 'Ignored' },
    { value: 'ALL', label: 'All' },
  ];
  protected readonly source = signal<SourceFilter>('ALL');
  protected readonly status = signal<StatusFilter>('OPEN');
  protected readonly sort = signal<CrashSort>('lastSeen');
  protected readonly page = linkedSignal({
    source: () => ({ source: this.source(), status: this.status(), sort: this.sort() }),
    computation: () => 1,
  });

  protected readonly crashes = resource({
    params: () => {
      const source = this.source();
      const status = this.status();
      return {
        source: source === 'ALL' ? undefined : source,
        status: status === 'ALL' ? undefined : status,
        sort: this.sort(),
        page: this.page(),
        limit: PAGE_SIZE,
      };
    },
    loader: ({ params }) => this.api.crashes(params),
  });
  protected readonly crashesState = computed(() =>
    panelState(this.crashes, (value) => value.items.length === 0),
  );
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil((this.crashes.value()?.total ?? 0) / PAGE_SIZE)),
  );
  protected readonly emptyHint = computed(() =>
    this.source() === 'ALL' && this.status() === 'OPEN'
      ? 'Crashes appear here as the web app, the engine and the backend report them.'
      : 'Nothing matches these filters.',
  );

  /** The group whose stack and latest occurrences are open under the table. */
  protected readonly selected = signal<CrashGroup | null>(null);
  protected readonly detail = resource({
    params: () => this.selected()?.id,
    loader: ({ params }) => this.api.crash(params),
  });
  protected readonly detailState = computed(() => panelState(this.detail, () => false));
  protected readonly busy = signal(false);

  protected toggle(group: CrashGroup): void {
    this.selected.set(this.selected()?.id === group.id ? null : group);
  }

  protected async setStatus(group: CrashGroup, status: CrashStatus): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.setStatus(group.id, status);
      this.feedback.toast(`${group.name} ${STATUS_TOASTS[status]}.`);
      this.crashes.reload();
      this.detail.reload();
    } catch (error) {
      this.feedback.toast(errorMessage(error), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  protected regressed(group: CrashGroup): boolean {
    return group.status === 'OPEN' && !!group.regressedAt;
  }

  protected readonly sourceLabels = CRASH_SOURCE_LABELS;
  protected readonly statusLabels = CRASH_STATUS_LABELS;
  protected readonly crashStatusChip = crashStatusChip;
  protected readonly compactPairs = compactPairs;
  protected readonly runtimeLine = runtimeLine;
  protected readonly formatCount = formatCount;
  protected readonly dayTime = dayTime;
  protected readonly shortAgo = shortAgo;
  protected readonly panelError = panelError;
}
