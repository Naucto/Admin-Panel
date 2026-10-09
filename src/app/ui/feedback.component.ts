import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

import { FeedbackService } from './feedback.service';
import { IconComponent } from './icon.component';

/** The confirmation dialog and the toast stack, mounted once at the root. */
@Component({
  selector: 'ad-feedback',
  imports: [IconComponent],
  template: `
    <dialog
      #dialog
      class="ad-dialog"
      (cancel)="$event.preventDefault(); feedback.answer(false)"
      (click)="$event.target === dialog && feedback.answer(false)"
    >
      @if (feedback.confirmation(); as request) {
        <div class="p-2.5">
          <h2 class="font-ui text-title text-ink">{{ request.title }}</h2>
          @for (paragraph of request.message.split('\\n\\n'); track $index) {
            <p class="mt-1 text-body text-ink-body">{{ paragraph }}</p>
          }
          <div class="mt-2.5 flex justify-end gap-1">
            <button
              type="button"
              class="ad-button ad-button-ghost"
              (click)="feedback.answer(false)"
            >
              Cancel
            </button>
            <button
              type="button"
              class="ad-button"
              [class.ad-button-danger]="request.danger"
              [class.ad-button-primary]="!request.danger"
              (click)="feedback.answer(true)"
            >
              {{ request.confirmLabel }}
            </button>
          </div>
        </div>
      }
    </dialog>
    <div class="fixed right-2 bottom-2 z-50 flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-1">
      @for (toast of feedback.toasts(); track toast.id) {
        <div class="ad-toast" [attr.data-tone]="toast.tone" role="status">
          <ad-icon
            [name]="
              toast.tone === 'error'
                ? 'warning-box'
                : toast.tone === 'success'
                  ? 'check'
                  : 'info-box'
            "
            [size]="24"
          />
          <span class="flex-1 text-body">{{ toast.text }}</span>
          <button
            type="button"
            class="text-ink-3 hover:text-ink"
            aria-label="Dismiss"
            (click)="feedback.dismiss(toast.id)"
          >
            <ad-icon name="close" [size]="12" />
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackComponent {
  protected readonly feedback = inject(FeedbackService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const open = this.feedback.confirmation() !== null;
      const dialog = this.dialog().nativeElement;
      if (open && !dialog.open) {
        dialog.showModal();
      } else if (!open && dialog.open) {
        dialog.close();
      }
    });
  }
}
