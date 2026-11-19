import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { IconComponent } from './icon.component';

/** Previous, where the list is, next. Draws nothing while everything fits one page. */
@Component({
  selector: 'nc-pager',
  imports: [IconComponent],
  template: `
    @if (pages() > 1) {
      <div class="mt-1 flex items-center justify-end gap-1">
        <button
          type="button"
          class="nc-button nc-button-ghost nc-button-sm"
          [disabled]="page() <= 1"
          (click)="page.set(page() - 1)"
        >
          <nc-icon name="chevron-left" [size]="12" /> Previous
        </button>
        <span class="font-mono text-label text-ink-3">{{ page() }} / {{ pages() }}</span>
        <button
          type="button"
          class="nc-button nc-button-ghost nc-button-sm"
          [disabled]="page() >= pages()"
          (click)="page.set(page() + 1)"
        >
          Next <nc-icon name="chevron-right" [size]="12" />
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagerComponent {
  readonly page = model.required<number>();
  readonly pages = input.required<number>();
}
