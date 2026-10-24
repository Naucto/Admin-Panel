import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  model,
  resource,
  signal,
} from '@angular/core';

import { TimelineApi } from '../core/timeline.api';
import type { GameChoice } from '../core/types';
import { IconComponent } from './icon.component';

const DEBOUNCE_MS = 250;

/**
 * Picks one published game by searching its name or id, so no page has to list every game there
 * is. Shows the chosen game as a chip that clears back to the search.
 */
@Component({
  selector: 'nc-game-picker',
  imports: [IconComponent],
  templateUrl: './game-picker.component.html',
  host: { class: 'relative block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePickerComponent {
  private readonly api = inject(TimelineApi);

  readonly value = model<GameChoice | null>(null);
  readonly placeholder = input('Search a game by name or #id');
  /** The words shown on the chip when nothing is chosen in a filter, such as `Every game`. */
  readonly label = input('');

  protected readonly term = signal('');
  protected readonly open = signal(false);
  private readonly debounced = signal('');
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly results = resource({
    params: () => (this.open() ? this.debounced() : undefined),
    loader: ({ params }) => this.api.searchReleases(params),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.timer) {
        clearTimeout(this.timer);
      }
    });
  }

  protected type(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.term.set(text);
    this.open.set(true);
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.debounced.set(text.trim());
    }, DEBOUNCE_MS);
  }

  protected focus(): void {
    this.open.set(true);
  }

  protected blur(): void {
    this.open.set(false);
  }

  protected choose(choice: GameChoice): void {
    this.value.set(choice);
    this.term.set('');
    this.debounced.set('');
    this.open.set(false);
  }

  protected chooseFirst(event: Event): void {
    event.preventDefault();
    const first = this.results.value()?.[0];
    if (first) {
      this.choose({ releaseId: first.releaseId, name: first.name });
    }
  }

  protected clear(): void {
    this.value.set(null);
  }
}
