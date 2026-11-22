import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  model,
} from '@angular/core';

const SEARCH_DELAY_MS = 250;

/** A search field whose value settles once the typing pauses, so a list is not asked per key. */
@Component({
  selector: 'nc-search-box',
  template: `<input
    type="search"
    class="nc-select w-full normal-case"
    [placeholder]="placeholder()"
    [attr.aria-label]="placeholder()"
    [value]="value()"
    (input)="type($any($event.target).value)"
  />`,
  host: { class: 'block w-[240px] max-w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBoxComponent {
  readonly value = model('');
  readonly placeholder = input('Search');

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clear();
    });
  }

  protected type(text: string): void {
    this.clear();
    this.timer = setTimeout(() => {
      this.value.set(text.trim());
    }, SEARCH_DELAY_MS);
  }

  private clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}
