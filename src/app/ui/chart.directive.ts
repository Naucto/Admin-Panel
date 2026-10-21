import {
  afterNextRender,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
} from '@angular/core';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';

import { chartTheme } from '../charts/chart-theme';
import { echarts } from '../charts/echarts';
import { type ChartInk, readInk } from '../charts/palette';
import { ThemeService } from '../core/theme.service';

/** An option, or a builder of one from the theme's colours so the chart follows a theme switch. */
export type ChartSpec = EChartsCoreOption | ((ink: ChartInk) => EChartsCoreOption);

/** ECharts events to listen to, by event name, such as `brushEnd`. */
export type ChartEvents = Record<string, (params: unknown) => void>;

/** Draws an ECharts option into its host, resizing with it and redrawing with the theme. */
@Directive({ selector: '[ncChart]', host: { class: 'block' } })
export class ChartDirective {
  readonly spec = input.required<ChartSpec | null>({ alias: 'ncChart' });
  readonly events = input<ChartEvents>({}, { alias: 'ncChartEvents' });
  /** Runs after every draw, for what an option cannot say, such as arming the brush. */
  readonly afterDraw = input<((chart: EChartsType) => void) | null>(null, {
    alias: 'ncChartAfterDraw',
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const theme = inject(ThemeService).theme;
    let chart: EChartsType | null = null;
    let ink: ChartInk = readInk();
    let bound: ChartEvents = {};
    const resize = new ResizeObserver(() => chart?.resize());

    const draw = (spec: ChartSpec | null): void => {
      if (chart && spec) {
        chart.setOption(typeof spec === 'function' ? spec(ink) : spec, { notMerge: true });
        untracked(this.afterDraw)?.(chart);
      }
    };
    const bind = (events: ChartEvents): void => {
      for (const name of Object.keys(bound)) {
        chart?.off(name);
      }
      bound = events;
      for (const [name, handler] of Object.entries(events)) {
        chart?.on(name, handler);
      }
    };

    afterNextRender(() => {
      resize.observe(host);
    });
    effect(() => {
      const name = `naucto-${theme()}`;
      untracked(() => {
        ink = readInk();
        echarts.registerTheme(name, chartTheme(ink));
        chart?.dispose();
        chart = echarts.init(host, name, { renderer: 'canvas' });
        bound = {};
        bind(this.events());
        draw(this.spec());
      });
    });
    effect(() => {
      const spec = this.spec();
      untracked(() => {
        draw(spec);
      });
    });
    effect(() => {
      const events = this.events();
      untracked(() => {
        bind(events);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      resize.disconnect();
      chart?.dispose();
    });
  }
}
