import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import type { FeedbackAccount } from '../core/types';
import { FeedbackService } from './feedback.service';
import { IconComponent } from './icon.component';

/**
 * Who sent a rating or a report: their name, their public profile and a way to write to them.
 * Compact fits a table cell; full stands on its own in a detail card.
 */
@Component({
  selector: 'nc-account-cell',
  imports: [IconComponent],
  templateUrl: './account-cell.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCellComponent {
  private readonly feedback = inject(FeedbackService);

  readonly account = input.required<FeedbackAccount>();
  readonly size = input<'compact' | 'full'>('compact');

  protected readonly name = computed(() => this.account().nickname || this.account().username);
  protected readonly compact = computed(() => this.size() === 'compact');

  protected async copyEmail(event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(this.account().email);
      this.feedback.toast('Email copied');
    } catch {
      this.feedback.toast('The email could not be copied.', 'error');
    }
  }
}
