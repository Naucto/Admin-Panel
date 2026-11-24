import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { shortId } from '../core/ids';
import { FeedbackService } from './feedback.service';

/**
 * An id by its first characters. A click copies the whole id, and the whole id is what assistive
 * technology reads. `plain` is for inside a link or a button, where a second control cannot nest:
 * the short form alone, still read whole.
 */
@Component({
  selector: 'nc-short-id',
  template: `
    @if (plain()) {
      <span aria-hidden="true">{{ short() }}</span>
      <span class="sr-only">{{ id() }}</span>
    } @else {
      <button
        type="button"
        class="cursor-copy underline-offset-2 hover:text-ink hover:underline"
        [title]="'Copy the id ' + id()"
        [attr.aria-label]="'Copy the id ' + id()"
        (click)="copy($event)"
      >
        {{ short() }}
      </button>
    }
  `,
  host: { class: 'font-mono normal-case' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortIdComponent {
  private readonly feedback = inject(FeedbackService);

  readonly id = input.required<string>();
  readonly plain = input(false, { transform: booleanAttribute });

  protected readonly short = computed(() => shortId(this.id()));

  protected async copy(event: Event): Promise<void> {
    // An id often sits in a row that opens on a click.
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(this.id());
      this.feedback.toast('Id copied');
    } catch {
      this.feedback.toast('The id could not be copied.', 'error');
    }
  }
}
