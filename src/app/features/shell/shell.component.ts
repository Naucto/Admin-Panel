import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import type { ShellRouteData } from '../../app.routes';
import { AuthStore } from '../../core/auth.store';
import { BugCountStore } from '../../core/bug-count.store';
import { CaseCountStore } from '../../core/case-count.store';
import { FiltersStore, RANGE_PRESETS, type RangePreset } from '../../core/filters.store';
import { landingFor, navFor } from '../../core/nav';
import { canOpen, roleLabel } from '../../core/roles';
import { ThemeService } from '../../core/theme.service';
import type { Grain } from '../../core/types';
import { IconComponent } from '../../ui/icon.component';
import { LogoComponent } from '../../ui/logo.component';
import { SegmentedComponent } from '../../ui/segmented.component';

const COUNT_REFRESH_MS = 60_000;

const badge = (count: number, hint: string): { count: number; hint: string } | null =>
  count > 0 ? { count, hint } : null;

@Component({
  selector: 'nc-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    LogoComponent,
    SegmentedComponent,
  ],
  templateUrl: './shell.component.html',
  host: { class: 'block min-h-dvh' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly filters = inject(FiltersStore);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly bugCount = inject(BugCountStore);
  private readonly caseCount = inject(CaseCountStore);

  protected readonly nav = computed(() => navFor(this.auth.role()));
  protected readonly home = computed(() => landingFor(this.auth.role()));
  protected readonly role = computed(() => roleLabel(this.auth.role()));
  protected readonly presets = RANGE_PRESETS;
  protected readonly grains: { value: Grain; label: string }[] = [
    { value: 'DAY', label: 'Day' },
    { value: 'WEEK', label: 'Week' },
    { value: 'MONTH', label: 'Month' },
  ];
  /** Counts shown beside a sidebar entry, by path; a zero shows nothing. */
  protected readonly badges = computed<Record<string, { count: number; hint: string } | null>>(
    () => ({
      '/bugs': badge(this.bugCount.count(), 'new'),
      '/moderation/queue': badge(this.caseCount.count(), 'waiting for a decision'),
    }),
  );
  protected readonly menuOpen = signal(false);
  protected readonly navOpen = signal(false);

  private readonly data = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.deepest()),
    ),
    { initialValue: this.deepest() },
  );
  protected readonly heading = computed(() => this.data().heading);
  protected readonly stats = computed(() => this.data().stats === true);

  protected readonly initial = computed(() =>
    (this.auth.account()?.nickname || this.auth.account()?.username || '?').charAt(0).toUpperCase(),
  );

  constructor() {
    // A count belongs to an area: a role that does not open it would only be refused the figure.
    const role = this.auth.role();
    const refresh = (): void => {
      if (canOpen(role, 'support')) {
        void this.bugCount.refresh();
      }
      if (canOpen(role, 'moderation')) {
        void this.caseCount.refresh();
      }
    };
    refresh();
    const timer = setInterval(refresh, COUNT_REFRESH_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
    });
  }

  protected setPreset(preset: RangePreset): void {
    this.filters.setPreset(preset);
  }

  protected setGrain(grain: Grain): void {
    this.filters.grainChoice.set(grain);
  }

  protected async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  /** The data of the innermost route the router settled on. */
  private deepest(): ShellRouteData {
    let snapshot = this.router.routerState.snapshot.root;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }
    const data = snapshot.data as Partial<ShellRouteData>;
    return { heading: data.heading ?? '', stats: data.stats === true };
  }
}
