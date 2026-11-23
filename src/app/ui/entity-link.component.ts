import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { panelRoute, targetName } from '../core/moderation-format';
import type { ModerationTargetType } from '../core/types';
import { IconComponent } from './icon.component';

/**
 * An account, a game or a comment by name: a link to its page in the console when it has one, and
 * beside it the way to the site when there is something to see there.
 */
@Component({
  selector: 'nc-entity-link',
  imports: [RouterLink, IconComponent],
  templateUrl: './entity-link.component.html',
  host: { class: 'inline-flex min-w-0 max-w-full items-center gap-0.25' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityLinkComponent {
  readonly type = input.required<ModerationTargetType>();
  readonly id = input.required<string>();
  readonly label = input<string | null>(null);
  readonly siteUrl = input<string | null>(null);

  protected readonly route = computed(() => panelRoute(this.type(), this.id()));
  protected readonly name = computed(() =>
    targetName({ type: this.type(), id: this.id(), label: this.label() }),
  );
}
