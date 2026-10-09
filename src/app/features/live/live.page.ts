import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  resource,
  signal,
} from '@angular/core';

import { presenceChart } from '../../charts/options';
import type { ChartInk } from '../../charts/palette';
import { AnalyticsApi } from '../../core/analytics.api';
import { formatCount } from '../../core/metric-catalog';
import type { PresenceSample } from '../../core/types';
import { ChartDirective } from '../../ui/chart.directive';
import { PanelComponent } from '../../ui/panel.component';
import { panelError, panelState } from '../../ui/panel-state';
import { SegmentedComponent } from '../../ui/segmented.component';

const REFRESH_MS = 30_000;
const HOUR_MS = 3_600_000;

type HistoryWindow = '24h' | '7d';

/** Every minute holds one sample; a week of them is drawn one point per quarter hour. */
function thin(samples: PresenceSample[], every: number): PresenceSample[] {
  if (every <= 1) {
    return samples;
  }
  const out: PresenceSample[] = [];
  for (let index = 0; index < samples.length; index += every) {
    const slice = samples.slice(index, index + every);
    const peak = slice.reduce((best, sample) =>
      sample.activeBrowsers + sample.anonTabs > best.activeBrowsers + best.anonTabs ? sample : best,
    );
    out.push(peak);
  }
  return out;
}

@Component({
  selector: 'nc-live-page',
  imports: [ChartDirective, PanelComponent, SegmentedComponent],
  templateUrl: './live.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LivePage {
  private readonly api = inject(AnalyticsApi);

  protected readonly live = resource({ loader: () => this.api.live() });
  protected readonly window = signal<HistoryWindow>('24h');
  protected readonly windows = [
    { value: '24h' as const, label: '24 hours' },
    { value: '7d' as const, label: '7 days' },
  ];
  protected readonly history = resource({
    params: () => this.window(),
    loader: ({ params }) => {
      const to = new Date();
      const from = new Date(to.getTime() - (params === '7d' ? 7 * 24 : 24) * HOUR_MS);
      return this.api.presence(from.toISOString(), to.toISOString());
    },
  });
  protected readonly updatedAt = signal(new Date());

  constructor() {
    const timer = setInterval(() => {
      this.live.reload();
      this.updatedAt.set(new Date());
    }, REFRESH_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
    });
  }

  protected readonly current = computed(() => this.live.value()?.current ?? null);
  protected readonly counters = computed(() => {
    const now = this.current();
    if (!now) {
      return [];
    }
    return [
      {
        label: 'Browsers',
        value: now.activeBrowsers,
        hint: 'accepted analytics, active this minute',
      },
      { label: 'Anonymous tabs', value: now.anonTabs, hint: 'declined or not asked, an estimate' },
      { label: 'Accounts', value: now.accounts, hint: 'signed in with a tab open' },
    ];
  });
  protected readonly activities = computed(() => {
    const now = this.current();
    if (!now) {
      return [];
    }
    const browsing =
      now.activeBrowsers -
      now.activeBrowsersPlaying -
      now.activeBrowsersBuilding -
      now.activeBrowsersHosting;
    const all = Math.max(1, now.activeBrowsers);
    return [
      { label: 'Playing', value: now.activeBrowsersPlaying, colour: 'bg-jade' },
      { label: 'Building', value: now.activeBrowsersBuilding, colour: 'bg-sky' },
      { label: 'Hosting', value: now.activeBrowsersHosting, colour: 'bg-orange' },
      { label: 'Browsing', value: browsing, colour: 'bg-gold' },
    ].map((row) => ({ ...row, share: Math.round((row.value / all) * 100) }));
  });

  protected readonly hourState = computed(() =>
    panelState(this.live, (value) => value.samples.length < 2),
  );
  protected readonly hour = computed(() => {
    const value = this.live.value();
    return value
      ? (ink: ChartInk) => presenceChart([...value.samples, value.current], true, ink)
      : null;
  });

  protected readonly historyState = computed(() =>
    panelState(this.history, (value) => value.samples.length < 2),
  );
  protected readonly historyOption = computed(() => {
    const value = this.history.value();
    if (!value) {
      return null;
    }
    const samples = thin(value.samples, this.window() === '7d' ? 15 : 1);
    return (ink: ChartInk) => presenceChart(samples, true, ink);
  });

  protected readonly formatCount = formatCount;
  protected readonly panelError = panelError;
}
