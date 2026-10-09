import { CHART_FONT_MONO, CHART_FONT_TEXT, type ChartInk, SERIES_COLOURS } from './palette';

/**
 * The frame every chart shares: LCD figures on the axes and legends, readable text in tooltips, and
 * the page's own lines, so a chart sits in a panel like the rest of Naucto does.
 */
export function chartTheme(ink: ChartInk): object {
  const axisLabel = { color: ink.ink3, fontFamily: CHART_FONT_MONO, fontSize: 10 };
  return {
    color: [...SERIES_COLOURS],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: CHART_FONT_TEXT, color: ink.ink2 },
    categoryAxis: {
      axisLine: { lineStyle: { color: ink.line } },
      axisTick: { show: false },
      axisLabel,
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel,
      splitLine: { lineStyle: { color: ink.line, type: [3, 3] } },
      nameTextStyle: axisLabel,
    },
    legend: {
      textStyle: { color: ink.ink2, fontFamily: CHART_FONT_MONO, fontSize: 10 },
      icon: 'rect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      inactiveColor: ink.line,
    },
    tooltip: {
      backgroundColor: ink.raised,
      borderColor: ink.line,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: ink.ink, fontFamily: CHART_FONT_TEXT, fontSize: 12 },
      axisPointer: {
        lineStyle: { color: ink.ink3, type: [2, 2] },
        crossStyle: { color: ink.ink3 },
        shadowStyle: { color: 'rgba(255, 209, 0, 0.06)' },
      },
    },
    visualMap: { textStyle: { color: ink.ink3, fontFamily: CHART_FONT_MONO, fontSize: 10 } },
  };
}
