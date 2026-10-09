import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { IconName } from './icon-paths';
import { IconComponent } from './icon.component';

export type PanelState = 'loading' | 'error' | 'empty' | 'ready';

/**
 * A card holding one view of the data. Its state decides what it shows: a placeholder while
 * loading, the reason when the request failed, and a plain statement when there is nothing to draw
 * yet, which early on is the common case rather than the exception.
 */
@Component({
  selector: 'ad-panel',
  imports: [IconComponent],
  templateUrl: './panel.component.html',
  host: { class: 'ad-card flex min-w-0 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelComponent {
  readonly heading = input<string>('');
  readonly hint = input<string>('');
  readonly state = input<PanelState>('ready');
  readonly error = input<string>('');
  readonly emptyTitle = input<string>('Nothing counted yet');
  readonly emptyHint = input<string>(
    'Numbers appear as visitors accept analytics. Days become final at 01:05 UTC the next day.',
  );
  readonly emptyIcon = input<IconName>('chart-bar');
  /** Height of the body while loading or empty, so a grid of panels does not jump. */
  readonly minHeight = input<number>(220);
  readonly retry = output();
}
