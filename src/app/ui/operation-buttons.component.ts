import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { operationForm, operationLabel } from '../core/moderation-format';
import type { ModerationOperation, ModerationTargetType } from '../core/types';
import type { IconName } from './icon-paths';
import { IconComponent } from './icon.component';

const ICONS: Record<ModerationOperation, IconName> = {
  DISMISS: 'close',
  HIDE: 'eye-closed',
  RESTORE: 'eye',
  DELETE: 'trash',
  WARN: 'warning-box',
  SUSPEND: 'lock',
  REINSTATE: 'reload',
  CLEAR_PROFILE: 'user',
  DELETE_ACCOUNT: 'trash',
};

/** One button per operation the backend allows on a target. Draws nothing when it allows none. */
@Component({
  selector: 'nc-operation-buttons',
  imports: [IconComponent],
  template: `
    @for (button of buttons(); track button.operation) {
      <button
        type="button"
        class="nc-button nc-button-sm"
        [class.nc-button-danger]="button.danger"
        [disabled]="busy()"
        (click)="choose.emit(button.operation)"
      >
        <nc-icon [name]="button.icon" [size]="12" /> {{ button.label }}
      </button>
    }
  `,
  host: { class: 'flex flex-wrap gap-0.75' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationButtonsComponent {
  readonly operations = input.required<readonly ModerationOperation[]>();
  readonly targetType = input.required<ModerationTargetType>();
  readonly busy = input(false);
  readonly choose = output<ModerationOperation>();

  protected readonly buttons = computed(() =>
    this.operations().map((operation) => ({
      operation,
      label: operationLabel(operation, this.targetType()),
      icon: ICONS[operation],
      danger: operationForm(operation).typeToConfirm,
    })),
  );
}
