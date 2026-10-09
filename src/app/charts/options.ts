import type { EChartsCoreOption } from 'echarts/core';

import { periodLabel } from '../core/dates';
import { formatCount, formatMetric, metricLabel } from '../core/metric-catalog';
import type { Funnel, Grain, PresenceSample, Retention, Series } from '../core/types';
import {
  ACTIVITY_COLOURS,
  CHART_FONT_MONO,
  type ChartInk,
  readInk,
  SERIES_COLOURS,
} from './palette';
import { firstProvisional, shapeOf } from './series-data';

export interface TrendLine {
  series: Series;
  /** Shown in the legend; the metric's own label when absent. */
  name?: string;
  kind?: 'line' | 'bar';
  /** Lines sharing a stack add up. */
  stack?: string;
  area?: boolean;
  colour?: string;
  /** The right-hand axis, for a metric in other units than the rest. */
  rightAxis?: boolean;
}

/** Most periods a line can show its points at before they turn into noise. */
const SYMBOL_LIMIT = 31;

interface TooltipParam {
  seriesIndex: number;
  seriesName: string;
  value: number | null;
  color: string;
  dataIndex: number;
  axisValueLabel?: string;
}

const STATUS_NOTE: Record<string, string> = {
  provisional: ' <span style="opacity:.6">· still counting</span>',
  unavailable: ' <span style="opacity:.6">· unavailable</span>',
};

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * A trend over periods. Three or fewer periods with data draw as labelled bars, since a line
 * through two points claims a trend nobody can see yet; days still being counted are shaded.
 */
export function trendChart(
  given: TrendLine[],
  grain: Grain,
  ink: ChartInk = readInk(),
): EChartsCoreOption {
  const sparse = shapeOf(given.map((line) => line.series)) === 'sparse';
  // Three periods with data spread over thirty would be slivers at one edge: only those periods
  // are drawn, side by side, and the chart says so.
  const kept = (given[0]?.series.points ?? [])
    .map((_, index) => index)
    .filter(
      (index) => !sparse || given.some((line) => (line.series.points[index]?.value ?? 0) !== 0),
    );
  const lines = given.map((line) => ({
    ...line,
    series: { ...line.series, points: kept.map((index) => line.series.points[index]!) },
  }));
  const points = lines[0]?.series.points ?? [];
  const categories = points.map((point) => periodLabel(point.periodStart, grain));
  const provisionalFrom = firstProvisional(points);
  const usesRight = lines.some((line) => line.rightAxis);
  const leftMetric = lines.find((line) => !line.rightAxis)?.series.metric ?? '';
  const rightMetric = lines.find((line) => line.rightAxis)?.series.metric ?? '';
  const valueAxis = (metric: string, right: boolean): object => ({
    type: 'value',
    position: right ? 'right' : 'left',
    minInterval: 1,
    splitLine: right ? { show: false } : undefined,
    axisLabel: { formatter: (value: number) => formatMetric(metric, value, true) },
  });

  return {
    grid: {
      left: 8,
      right: 8,
      top: lines.length > 1 || sparse ? 36 : 16,
      bottom: 4,
      containLabel: true,
    },
    legend: lines.length > 1 ? { top: 0, left: 0 } : undefined,
    title: sparse
      ? {
          text: 'ONLY PERIODS WITH DATA',
          right: 0,
          top: 2,
          textStyle: {
            fontFamily: CHART_FONT_MONO,
            fontSize: 9,
            fontWeight: 'normal',
            color: ink.ink3,
          },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: sparse ? 'shadow' : 'line' },
      formatter: (params: TooltipParam[]) => {
        const rows = params.map((param) => {
          const line = lines[param.seriesIndex];
          const point = line?.series.points[param.dataIndex];
          const value = formatMetric(line?.series.metric ?? '', param.value ?? null);
          return (
            `<div style="display:flex;gap:10px;justify-content:space-between;align-items:center">` +
            `<span><span style="display:inline-block;width:8px;height:8px;background:${param.color};margin-right:6px"></span>` +
            `${escape(param.seriesName)}</span><b>${value}</b></div>` +
            (point ? (STATUS_NOTE[point.status] ?? '') : '')
          );
        });
        return `<div style="opacity:.7;margin-bottom:4px">${escape(params[0]?.axisValueLabel ?? '')}</div>${rows.join('')}`;
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: sparse || lines.some((l) => l.kind === 'bar'),
    },
    yAxis: usesRight
      ? [valueAxis(leftMetric, false), valueAxis(rightMetric, true)]
      : valueAxis(leftMetric, false),
    series: lines.map((line, index) => {
      const kind = sparse ? 'bar' : (line.kind ?? 'line');
      const colour = line.colour ?? SERIES_COLOURS[index % SERIES_COLOURS.length];
      return {
        name: line.name ?? metricLabel(line.series.metric),
        type: kind,
        stack: line.stack,
        yAxisIndex: line.rightAxis ? 1 : 0,
        data: line.series.points.map((point) => point.value),
        itemStyle: {
          color: colour,
          borderRadius: kind === 'bar' && !line.stack ? [2, 2, 0, 0] : 0,
        },
        barMaxWidth: sparse ? 36 : 22,
        label:
          sparse && !line.stack
            ? {
                show: true,
                position: 'top',
                fontFamily: CHART_FONT_MONO,
                fontSize: 10,
                color: colour,
                formatter: ({ value }: { value: number | null }) =>
                  value ? formatMetric(line.series.metric, value, true) : '',
              }
            : undefined,
        lineStyle: kind === 'line' ? { width: 2 } : undefined,
        smooth: false,
        step: false,
        showSymbol: points.length <= SYMBOL_LIMIT,
        symbol: 'rect',
        symbolSize: 5,
        connectNulls: false,
        areaStyle: line.area ? { opacity: 0.12 } : undefined,
        emphasis: { focus: 'series' },
        markArea:
          index === 0 && provisionalFrom >= 0 && !sparse
            ? {
                silent: true,
                itemStyle: { color: 'rgba(255, 209, 0, 0.05)' },
                label: {
                  show: true,
                  position: 'insideTopRight',
                  formatter: 'COUNTING',
                  fontFamily: CHART_FONT_MONO,
                  fontSize: 9,
                  color: ink.ink3,
                },
                data: [[{ xAxis: categories[provisionalFrom] }, { xAxis: categories.at(-1) }]],
              }
            : undefined,
      };
    }),
  };
}

export interface BarItem {
  label: string;
  value: number;
}

/** Ranked horizontal bars, labelled with their value and their share of the whole. */
export function rankedBars(
  items: BarItem[],
  metric: string,
  colour: string = SERIES_COLOURS[1],
): EChartsCoreOption {
  const sum = items.reduce((total, item) => total + item.value, 0);
  const ordered = [...items].sort((a, b) => b.value - a.value).reverse();
  return {
    grid: { left: 8, right: 56, top: 4, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value }: { name: string; value: number }) =>
        `${escape(name)}<br><b>${formatMetric(metric, value)}</b> · ${sum ? Math.round((value / sum) * 100) : 0}%`,
    },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: ordered.map((item) => item.label),
      axisLine: { show: false },
      axisLabel: { width: 120, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: ordered.map((item) => item.value),
        barMaxWidth: 16,
        itemStyle: { color: colour, borderRadius: [0, 2, 2, 0] },
        showBackground: true,
        backgroundStyle: { color: 'rgba(128, 128, 128, 0.08)' },
        label: {
          show: true,
          position: 'right',
          fontFamily: CHART_FONT_MONO,
          fontSize: 10,
          color: colour,
          formatter: ({ value }: { value: number }) =>
            `${formatMetric(metric, value, true)}  ${sum ? Math.round((value / sum) * 100) : 0}%`,
        },
      },
    ],
  };
}

export function donutChart(items: BarItem[], metric: string): EChartsCoreOption {
  return {
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value, percent }: { name: string; value: number; percent: number }) =>
        `${escape(name)}<br><b>${formatMetric(metric, value)}</b> · ${percent}%`,
    },
    legend: { bottom: 0, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '44%'],
        padAngle: 2,
        itemStyle: { borderRadius: 2 },
        label: { show: false },
        data: items.map((item) => ({ name: item.label, value: item.value })),
      },
    ],
  };
}

const STEP_LABELS: Record<string, string> = {
  visited: 'Visited',
  played: 'Played a game',
  signedUp: 'Signed up',
  createdProject: 'Created a project',
  published: 'Published a game',
};

/** Each step as a bar, with its share of the first step and of the step before it. */
export function funnelChart(funnel: Funnel, ink: ChartInk = readInk()): EChartsCoreOption {
  const top = funnel.steps[0]?.count ?? 0;
  const steps = funnel.steps.map((step, index) => {
    const before = index === 0 ? step.count : (funnel.steps[index - 1]?.count ?? 0);
    return {
      label: STEP_LABELS[step.step] ?? step.step,
      count: step.count,
      ofTop: top ? Math.round((step.count / top) * 1000) / 10 : 0,
      ofBefore: before ? Math.round((step.count / before) * 1000) / 10 : 0,
    };
  });
  return {
    grid: { left: 8, right: 120, top: 4, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: ({ dataIndex }: { dataIndex: number }) => {
        const step = steps[steps.length - 1 - dataIndex];
        return step
          ? `${escape(step.label)}<br><b>${formatCount(step.count)}</b><br>${step.ofTop}% of visitors · ${step.ofBefore}% of the step before`
          : '';
      },
    },
    xAxis: { type: 'value', show: false, max: top || 1 },
    yAxis: {
      type: 'category',
      data: [...steps].reverse().map((step) => step.label),
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 22,
        data: [...steps].reverse().map((step, index) => ({
          value: step.count,
          itemStyle: {
            color: SERIES_COLOURS[(steps.length - 1 - index) % SERIES_COLOURS.length],
            borderRadius: [0, 2, 2, 0],
          },
        })),
        showBackground: true,
        backgroundStyle: { color: 'rgba(128, 128, 128, 0.08)' },
        label: {
          show: true,
          position: 'right',
          fontFamily: CHART_FONT_MONO,
          fontSize: 10,
          color: ink.ink2,
          formatter: ({ dataIndex }: { dataIndex: number }) => {
            const step = steps[steps.length - 1 - dataIndex];
            return step ? `${formatCount(step.count)}  ${step.ofTop}%` : '';
          },
        },
      },
    ],
  };
}

/**
 * Each cohort's share of returning visitors after 1, 7 and 30 days. A cell whose return day is not
 * final yet stays empty and says when it will be.
 */
export function retentionChart(retention: Retention, ink: ChartInk = readInk()): EChartsCoreOption {
  const offsets = [1, 7, 30];
  const cohorts = retention.cohorts.filter((cohort) => cohort.size > 0);
  const cells: [number, number, number | null][] = [];
  cohorts.forEach((cohort, row) => {
    offsets.forEach((offsetDays, column) => {
      const offset = cohort.offsets.find((one) => one.offsetDays === offsetDays);
      cells.push([
        column,
        row,
        offset?.rate === null || offset?.rate === undefined
          ? null
          : Math.round(offset.rate * 1000) / 10,
      ]);
    });
  });
  const highest = Math.max(10, ...cells.map((cell) => cell[2] ?? 0));
  return {
    grid: { left: 8, right: 8, top: 24, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: ({ value }: { value: [number, number, number | null] }) => {
        const cohort = cohorts[value[1]];
        const offset = cohort?.offsets.find((one) => one.offsetDays === offsets[value[0]]);
        if (!cohort) {
          return '';
        }
        const head = `Cohort of ${cohort.cohortDay} · ${formatCount(cohort.size)} people`;
        return offset?.rate === null || offset?.rate === undefined
          ? `${head}<br>Day ${offsets[value[0]]}: not final yet`
          : `${head}<br>Day ${offsets[value[0]]}: <b>${Math.round(offset.rate * 1000) / 10}%</b> (${formatCount(offset.retained ?? 0)})`;
      },
    },
    xAxis: {
      type: 'category',
      position: 'top',
      data: offsets.map((day) => `DAY ${day}`),
      splitArea: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: cohorts.map((cohort) => `${cohort.cohortDay.slice(5)}  ·  ${formatCount(cohort.size)}`),
      axisLine: { show: false },
    },
    visualMap: {
      show: false,
      min: 0,
      max: highest,
      inRange: { color: [ink.raised, '#0e8a5a', '#10d275', '#ffd100'] },
    },
    series: [
      {
        type: 'heatmap',
        data: cells.map((cell) => ({
          value: cell[2] === null ? [cell[0], cell[1], '-'] : cell,
          label: {
            // Dark figures on the bright end of the scale, the page's ink on the dark end.
            color: cell[2] !== null && cell[2] / highest > 0.55 ? '#0b0a09' : ink.ink,
          },
        })),
        itemStyle: { borderColor: ink.panel, borderWidth: 3 },
        label: {
          show: true,
          fontFamily: CHART_FONT_MONO,
          fontSize: 10,
          formatter: ({ value }: { value: [number, number, number | string] }) =>
            typeof value[2] === 'number' ? `${value[2]}%` : '···',
        },
      },
    ],
  };
}

/** The last hour of consenting browsers stacked by activity, with the anonymous estimate apart. */
export function presenceChart(
  samples: PresenceSample[],
  withAnonymous = true,
  ink: ChartInk = readInk(),
): EChartsCoreOption {
  const times = samples.map((sample) => sample.at.slice(11, 16));
  const stacked = (name: string, colour: string, data: number[]): object => ({
    name,
    type: 'line',
    stack: 'browsers',
    showSymbol: false,
    lineStyle: { width: 1, color: colour },
    itemStyle: { color: colour },
    areaStyle: { color: colour, opacity: 0.45 },
    data,
  });
  return {
    grid: { left: 8, right: 8, top: 36, bottom: 4, containLabel: true },
    legend: { top: 0, left: 0 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: times, boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      stacked(
        'Playing',
        ACTIVITY_COLOURS.playing,
        samples.map((s) => s.activeBrowsersPlaying),
      ),
      stacked(
        'Building',
        ACTIVITY_COLOURS.building,
        samples.map((s) => s.activeBrowsersBuilding),
      ),
      stacked(
        'Hosting',
        ACTIVITY_COLOURS.hosting,
        samples.map((s) => s.activeBrowsersHosting),
      ),
      stacked(
        'Browsing',
        ACTIVITY_COLOURS.browsing,
        samples.map(
          (s) =>
            s.activeBrowsers -
            s.activeBrowsersPlaying -
            s.activeBrowsersBuilding -
            s.activeBrowsersHosting,
        ),
      ),
      ...(withAnonymous
        ? [
            {
              name: 'Anonymous tabs (est.)',
              type: 'line',
              showSymbol: false,
              lineStyle: { type: [4, 3], width: 1.5, color: '#ff80a4' },
              itemStyle: { color: '#ff80a4' },
              data: samples.map((s) => s.anonTabs),
            },
            {
              name: 'Signed-in accounts',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.5, color: ink.ink },
              itemStyle: { color: ink.ink },
              data: samples.map((s) => s.accounts),
            },
          ]
        : []),
    ],
  };
}

/** A small trend with no axes, behind a headline number. */
export function sparkline(values: number[], colour: string = SERIES_COLOURS[0]): EChartsCoreOption {
  return {
    grid: { left: 0, right: 0, top: 2, bottom: 0 },
    xAxis: {
      type: 'category',
      show: false,
      boundaryGap: false,
      data: values.map((_, index) => index),
    },
    yAxis: { type: 'value', show: false, min: 0 },
    series: [
      {
        type: 'line',
        data: values,
        showSymbol: false,
        lineStyle: { width: 1.5, color: colour },
        areaStyle: { color: colour, opacity: 0.15 },
      },
    ],
  };
}
