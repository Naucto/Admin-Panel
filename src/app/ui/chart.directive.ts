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

/** Draws an ECharts option into its host, resizing with it and redrawing with the theme. */
@Directive({ selector: '[adChart]', host: { class: 'block' } })
export class ChartDirective {
  readonly spec = input.required<ChartSpec | null>({ alias: 'adChart' });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const theme = inject(ThemeService).theme;
    let chart: EChartsType | null = null;
    let ink: ChartInk = readInk();
    const resize = new ResizeObserver(() => chart?.resize());

    const draw = (spec: ChartSpec | null): void => {
      if (chart && spec) {
        chart.setOption(typeof spec === 'function' ? spec(ink) : spec, { notMerge: true });
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
        draw(this.spec());
      });
    });
    effect(() => {
      const spec = this.spec();
      untracked(() => {
        draw(spec);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      resize.disconnect();
      chart?.dispose();
    });
  }
}
