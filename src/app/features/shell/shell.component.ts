import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import type { ShellRouteData } from '../../app.routes';
import { AuthStore } from '../../core/auth.store';
import { FiltersStore, RANGE_PRESETS, type RangePreset } from '../../core/filters.store';
import { ThemeService } from '../../core/theme.service';
import type { Grain } from '../../core/types';
import type { IconName } from '../../ui/icon-paths';
import { IconComponent } from '../../ui/icon.component';
import { LogoComponent } from '../../ui/logo.component';
import { SegmentedComponent } from '../../ui/segmented.component';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

const STATS_NAV: NavItem[] = [
  { path: '/overview', label: 'Overview', icon: 'dashboard' },
  { path: '/audience', label: 'Audience', icon: 'users' },
  { path: '/games', label: 'Games', icon: 'gamepad' },
  { path: '/creators', label: 'Creators', icon: 'paint-bucket' },
  { path: '/live', label: 'Live', icon: 'zap' },
  { path: '/explorer', label: 'Explorer', icon: 'chart' },
];

const ADMIN_NAV: NavItem[] = [
  { path: '/admins', label: 'Admins', icon: 'shield' },
  { path: '/account', label: 'Account', icon: 'user' },
];

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

  protected readonly statsNav = STATS_NAV;
  protected readonly adminNav = ADMIN_NAV;
  protected readonly presets = RANGE_PRESETS;
  protected readonly grains: { value: Grain; label: string }[] = [
    { value: 'DAY', label: 'Day' },
    { value: 'WEEK', label: 'Week' },
    { value: 'MONTH', label: 'Month' },
  ];
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
