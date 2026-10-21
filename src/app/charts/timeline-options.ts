import type { EChartsCoreOption } from 'echarts/core';

import { bucketLabel, instantLabel } from '../core/instants';
import { formatCount } from '../core/metric-catalog';
import type { InstantRange } from '../core/timeline.api';
import { DERIVED_FROM, TIMELINE_LABELS, type TimelineRow } from '../core/timeline-catalog';
import type { Marker, Timeline, TimelineBucket } from '../core/types';
import { groupMarkers, markerLineOption } from './markers';
import { escape } from './html';
import { CHART_FONT_MONO, type ChartInk } from './palette';

export const ROW_HEIGHT = 132;
const ROW_GAP = 34;
const TOP = 30;
const BOTTOM = 26;

export interface DrawnSeries {
  name: string;
  colour: string;
  values: (number | null)[];
}

/** The series a row draws from a timeline answer, derived ones computed. */
export function rowSeries(row: TimelineRow, timeline: Timeline): DrawnSeries[] {
  const valuesOf = (metric: string): (number | null)[] =>
    timeline.series.find((series) => series.metric === metric)?.values ?? [];
  const drawn = row.series.map((spec) => {
    if ('metric' in spec) {
      const label = TIMELINE_LABELS[spec.metric];
      return {
        name: label.label,
        colour: label.colour,
        values: valuesOf(spec.metric),
        derived: false,
      };
    }
    const [whole, ...parts] = DERIVED_FROM[spec.derived].map(valuesOf);
    return {
      name: spec.label,
      colour: spec.colour,
      derived: true,
      values: (whole ?? []).map((value, index) => {
        const taken = parts.map((part) => part[index]);
        return value === null || taken.some((part) => part === null || part === undefined)
          ? null
          : Math.max(0, value - taken.reduce<number>((sum, part) => sum + (part ?? 0), 0));
      }),
    };
  });
  // A remainder that is empty everywhere would only add a legend entry for nothing.
  return drawn
    .filter((series) => !series.derived || series.values.some((value) => (value ?? 0) > 0))
    .map(({ name, colour, values }) => ({ name, colour, values }));
}

/** The bucket a marker falls in, or -1 when it is outside the timeline. */
export function bucketIndexOf(timeline: Timeline, at: number): number {
  const first = Date.parse(timeline.from);
  const index = Math.floor((at - first) / timeline.bucketMs);
  return index >= 0 && index < timeline.buckets.length ? index : -1;
}

export function timelineHeight(rows: number): number {
  return TOP + rows * (ROW_HEIGHT + ROW_GAP) - ROW_GAP + BOTTOM;
}

interface TooltipParam {
  seriesName: string;
  value: number | null;
  color: string;
  dataIndex: number;
}

function tooltipRows(params: TooltipParam[], format = formatCount): string {
  return params
    .map(
      (param) =>
        `<div style="display:flex;gap:12px;justify-content:space-between;align-items:center">` +
        `<span><span style="display:inline-block;width:10px;height:2px;background:${param.color};margin-right:6px;vertical-align:middle"></span>` +
        `${escape(param.seriesName)}</span><b>${param.value === null || param.value === undefined ? '--' : format(param.value)}</b></div>`,
    )
    .join('');
}

function bucketRange(timeline: Timeline, index: number): string {
  const start = Date.parse(timeline.buckets[index] ?? timeline.from);
  const end = start + timeline.bucketMs;
  return timeline.bucket === '1d'
    ? instantLabel(start).slice(0, -6)
    : `${instantLabel(start)} – ${instantLabel(end).slice(-5)}`;
}

function markerLines(
  timeline: Timeline,
  markers: readonly Marker[],
  ink: ChartInk,
  labelled: boolean,
): object | undefined {
  return markerLineOption(
    groupMarkers(markers, (at) => bucketIndexOf(timeline, at)),
    ink,
    labelled,
  );
}

/**
 * Every chosen row stacked under one time axis, each with its own scale, sharing the crosshair
 * and the selection: dragging across any row selects that stretch of time in all of them.
 */
export function timelineChart(
  timeline: Timeline,
  rows: readonly TimelineRow[],
  markers: readonly Marker[],
  ink: ChartInk,
): EChartsCoreOption {
  const spanMs = Date.parse(timeline.to) - Date.parse(timeline.from);
  const categories = timeline.buckets.map((at) =>
    bucketLabel(Date.parse(at), timeline.bucket as TimelineBucket, spanMs),
  );
  const drawn = rows.map((row) => rowSeries(row, timeline));
  const top = (index: number): number => TOP + index * (ROW_HEIGHT + ROW_GAP);

  return {
    animation: false,
    axisPointer: { link: [{ xAxisIndex: 'all' }], label: { show: false } },
    title: rows.map((row, index) => ({
      text: row.label.toUpperCase(),
      left: 0,
      top: top(index) - 24,
      textStyle: {
        fontFamily: CHART_FONT_MONO,
        fontSize: 10,
        fontWeight: 'normal',
        color: ink.ink2,
      },
    })),
    legend: rows.map((row, index) => ({
      top: top(index) - 26,
      right: 0,
      data: drawn[index]!.map((series) => series.name),
      icon: row.kind === 'bar' ? 'rect' : 'path://M0,4 L14,4 L14,6 L0,6 Z',
      itemWidth: row.kind === 'bar' ? 10 : 14,
      itemHeight: row.kind === 'bar' ? 10 : 6,
    })),
    grid: rows.map((_, index) => ({
      left: 8,
      right: 8,
      top: top(index),
      height: ROW_HEIGHT,
      containLabel: true,
    })),
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: TooltipParam[]) =>
        `<div style="opacity:.7;margin-bottom:4px">${escape(bucketRange(timeline, params[0]?.dataIndex ?? 0))} UTC</div>${tooltipRows(params)}`,
    },
    brush: {
      xAxisIndex: 'all',
      brushLink: 'all',
      brushType: 'lineX',
      brushMode: 'single',
      transformable: true,
      throttleType: 'debounce',
      throttleDelay: 150,
      brushStyle: {
        color: 'rgba(255, 209, 0, 0.10)',
        borderColor: 'rgba(255, 209, 0, 0.6)',
        borderWidth: 1,
      },
      outOfBrush: { colorAlpha: 0.35 },
    },
    toolbox: { show: false, feature: { brush: { type: ['lineX'] } } },
    xAxis: rows.map((row, index) => ({
      type: 'category',
      gridIndex: index,
      data: categories,
      boundaryGap: row.kind === 'bar',
      axisLabel: { show: index === rows.length - 1, hideOverlap: true },
      axisTick: { show: false },
    })),
    yAxis: rows.map((_, index) => ({
      type: 'value',
      gridIndex: index,
      minInterval: 1,
      splitNumber: 3,
      axisLabel: { formatter: (value: number) => formatCount(value, true) },
    })),
    series: rows.flatMap((row, index) =>
      drawn[index]!.map((series, position) => ({
        name: series.name,
        type: row.kind,
        xAxisIndex: index,
        yAxisIndex: index,
        stack: row.stacked ? row.key : undefined,
        data: series.values,
        itemStyle: {
          color: series.colour,
          borderRadius:
            row.kind === 'bar' && (!row.stacked || position === drawn[index]!.length - 1)
              ? [2, 2, 0, 0]
              : 0,
        },
        barMaxWidth: 18,
        barGap: '10%',
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: row.kind === 'line' ? { width: 2, color: series.colour } : undefined,
        connectNulls: false,
        emphasis: { focus: 'series' },
        markLine: position === 0 ? markerLines(timeline, markers, ink, index === 0) : undefined,
      })),
    ),
  };
}

export type CompareMode = 'counts' | 'peak';

/**
 * Chosen series over one time axis and one scale. Series of very different sizes are read as a
 * share of their own peak, so their shapes compare without a second axis.
 */
export function compareChart(
  timeline: {
    buckets: string[];
    bucket: TimelineBucket;
    from: string;
    to: string;
    bucketMs: number;
  },
  series: readonly DrawnSeries[],
  mode: CompareMode,
  kind: 'line' | 'bar',
  markers: readonly Marker[],
  ink: ChartInk,
): EChartsCoreOption {
  const spanMs = Date.parse(timeline.to) - Date.parse(timeline.from);
  const categories = timeline.buckets.map((at) =>
    bucketLabel(Date.parse(at), timeline.bucket, spanMs),
  );
  const scaled = series.map((one) => {
    if (mode === 'counts') {
      return one.values;
    }
    const peak = Math.max(0, ...one.values.map((value) => value ?? 0));
    return one.values.map((value) =>
      value === null ? null : peak > 0 ? Math.round((value / peak) * 1000) / 10 : 0,
    );
  });
  const asTimeline = { ...timeline, rawFrom: timeline.from, series: [] } as Timeline;
  const format = (value: number): string =>
    mode === 'peak' ? `${String(value)}%` : formatCount(value);

  return {
    animation: false,
    grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, data: series.map((one) => one.name) },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: TooltipParam[]) => {
        const raw =
          mode === 'peak'
            ? `<div style="opacity:.6;margin-top:4px">Counts: ${params
                .map((param) => {
                  const one = series.find((candidate) => candidate.name === param.seriesName);
                  const value = one?.values[param.dataIndex];
                  return `${escape(param.seriesName)} ${value === null || value === undefined ? '--' : formatCount(value)}`;
                })
                .join(' · ')}</div>`
            : '';
        return `<div style="opacity:.7;margin-bottom:4px">${escape(bucketRange(asTimeline, params[0]?.dataIndex ?? 0))} UTC</div>${tooltipRows(params, format)}${raw}`;
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: kind === 'bar',
      axisLabel: { hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      minInterval: mode === 'counts' ? 1 : undefined,
      max: mode === 'peak' ? 100 : undefined,
      axisLabel: { formatter: (value: number) => format(value) },
    },
    series: series.map((one, index) => ({
      name: one.name,
      type: kind,
      data: scaled[index],
      itemStyle: { color: one.colour, borderRadius: kind === 'bar' ? [2, 2, 0, 0] : 0 },
      lineStyle: kind === 'line' ? { width: 2, color: one.colour } : undefined,
      showSymbol: false,
      symbolSize: 8,
      barMaxWidth: 14,
      connectNulls: false,
      emphasis: { focus: 'series' },
      markLine: index === 0 ? markerLines(asTimeline, markers, ink, true) : undefined,
    })),
  };
}

/** The running total after a post beside the running total those hours usually reach. */
export function impactChart(
  curve: { hours: number[]; actual: (number | null)[]; usual: (number | null)[] },
  label: string,
  colour: string,
  ink: ChartInk,
): EChartsCoreOption {
  const hourLabel = (hours: number): string =>
    hours < 1 ? `+${String(Math.round(hours * 60))}m` : `+${String(Math.round(hours * 10) / 10)}h`;
  return {
    animation: false,
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: TooltipParam[]) =>
        `<div style="opacity:.7;margin-bottom:4px">${escape(hourLabel(curve.hours[params[0]?.dataIndex ?? 0] ?? 0))} after the post</div>${tooltipRows(params)}`,
    },
    xAxis: {
      type: 'category',
      data: curve.hours.map(hourLabel),
      boundaryGap: false,
      axisLabel: { hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { formatter: (value: number) => formatCount(value, true) },
    },
    series: [
      {
        name: `${label} since the post`,
        type: 'line',
        data: curve.actual,
        showSymbol: false,
        lineStyle: { width: 2, color: colour },
        itemStyle: { color: colour },
        areaStyle: { color: colour, opacity: 0.1 },
        connectNulls: false,
      },
      {
        name: 'Usual for those hours',
        type: 'line',
        data: curve.usual,
        showSymbol: false,
        lineStyle: { width: 2, color: ink.ink3, type: [4, 3] },
        itemStyle: { color: ink.ink3 },
        connectNulls: false,
      },
    ],
  };
}
