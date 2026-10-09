import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** A row of mutually exclusive choices, as Naucto's own segmented control. */
@Component({
  selector: 'ad-segmented',
  template: `<div class="ad-segmented" role="radiogroup" [attr.aria-label]="label()">
    @for (option of options(); track option.value) {
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="option.value === value()"
        (click)="value.set(option.value)"
      >
        {{ option.label }}
      </button>
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedComponent<T extends string> {
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model.required<T>();
  readonly label = input<string>('');
}
