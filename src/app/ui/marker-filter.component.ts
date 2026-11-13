import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { instantLabel } from '../core/instants';
import { MarkerVisibilityStore } from '../core/marker-visibility.store';
import type { Marker } from '../core/types';
import { IconComponent } from './icon.component';

/** Chooses which of the posts of a window the charts draw, one by one or a channel at a time. */
@Component({
  selector: 'nc-marker-filter',
  imports: [IconComponent],
  templateUrl: './marker-filter.component.html',
  host: { class: 'relative inline-block', '(document:keydown.escape)': 'open.set(false)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerFilterComponent {
  protected readonly store = inject(MarkerVisibilityStore);

  readonly markers = input.required<readonly Marker[]>();

  protected readonly open = signal(false);
  protected readonly shown = computed(() => this.store.visible(this.markers()).length);
  protected readonly newestFirst = computed(() => [...this.markers()].reverse());
  protected readonly channels = computed(() => {
    const byChannel = new Map<string, Marker[]>();
    for (const marker of this.markers()) {
      const channel = marker.channel ?? 'No channel';
      byChannel.set(channel, [...(byChannel.get(channel) ?? []), marker]);
    }
    const hidden = this.store.hidden();
    return [...byChannel.entries()].map(([name, markers]) => ({
      name,
      markers,
      shown: markers.some((marker) => !hidden.has(marker.id)),
    }));
  });

  protected isShown(marker: Marker): boolean {
    return !this.store.hidden().has(marker.id);
  }

  protected readonly instantLabel = instantLabel;
}
