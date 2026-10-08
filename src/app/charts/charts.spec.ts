import type { Point, Series } from '../core/types';
import { combine } from './derived';
import { funnelChart, retentionChart, trendChart } from './options';
import type { ChartInk } from './palette';
import { shapeOf, total } from './series-data';

const INK: ChartInk = {
  ink: '#eee',
  ink2: '#aaa',
  ink3: '#888',
  line: '#333',
  lineSoft: '#222',
  panel: '#111',
  raised: '#1a1a1a',
  page: '#000',
};

const point = (day: number, value: number | null, status: Point['status'] = 'final'): Point => ({
  periodStart: `2026-10-${String(day).padStart(2, '0')}`,
  value,
  status,
  samplerCoverage: null,
  ingestErrorRate: null,
});

const series = (metric: string, values: (number | null)[], status?: Point['status']): Series => ({
  metric,
  dimension: '',
  grain: 'DAY',
  definitionVersion: 1,
  points: values.map((value, index) => point(index + 1, value, status)),
});

describe('shapeOf', () => {
  it('tells nothing counted from a counted zero', () => {
    expect(shapeOf([series('plays', [null, null])])).toBe('empty');
    expect(shapeOf([series('plays', [0, 0, null])])).toBe('zero');
  });

  it('calls three periods with data sparse, and more a trend', () => {
    expect(shapeOf([series('plays', [0, 4, 0, 2, 0, 1])])).toBe('sparse');
    expect(shapeOf([series('plays', [1, 4, 3, 2, 0, 1])])).toBe('full');
  });

  it('counts periods across series, so two sparse lines on different days add up', () => {
    expect(shapeOf([series('a', [1, 0, 0, 0]), series('b', [0, 1, 1, 1])])).toBe('full');
  });

  it('ignores unavailable periods', () => {
    expect(shapeOf([series('plays', [5, 5, 5, 5], 'unavailable')])).toBe('empty');
  });
});

describe('total', () => {
  it('adds the valued periods only', () => {
    expect(total(series('plays', [1, null, 2]))).toBe(3);
  });
});

describe('combine', () => {
  it('computes period by period, and leaves a period without a denominator empty', () => {
    const rate = combine(
      'bounce_rate',
      series('sessions_bounced', [1, 2, null]),
      series('sessions', [4, 0, 5]),
      (top, bottom) => (top / bottom) * 100,
    );

    expect(rate.metric).toBe('bounce_rate');
    expect(rate.points.map((one) => one.value)).toEqual([25, null, null]);
  });

  it('keeps the least settled status of the two', () => {
    const numerator = series('a', [1]);
    const denominator = series('b', [2], 'provisional');

    expect(combine('c', numerator, denominator, (a, b) => a / b).points[0]?.status).toBe(
      'provisional',
    );
  });
});

describe('trendChart', () => {
  type Built = { series: { type: string; label?: { show: boolean } }[] };

  it('draws lines for a trend, and labelled bars when only a few periods have data', () => {
    const full = trendChart([{ series: series('plays', [1, 2, 3, 4, 5]) }], 'DAY', INK) as Built;
    const sparse = trendChart([{ series: series('plays', [0, 0, 7, 0]) }], 'DAY', INK) as Built;

    expect(full.series[0]?.type).toBe('line');
    expect(sparse.series[0]?.type).toBe('bar');
    expect(sparse.series[0]?.label?.show).toBe(true);
  });

  it('puts a metric in other units on a second axis', () => {
    const option = trendChart(
      [
        { series: series('plays', [1, 2, 3, 4]) },
        { series: series('playtime_ms', [1, 2, 3, 4]), rightAxis: true },
      ],
      'DAY',
      INK,
    ) as { yAxis: unknown[] };

    expect(option.yAxis).toHaveLength(2);
  });
});

describe('funnelChart', () => {
  it('orders the steps top-down and survives an empty first step', () => {
    const option = funnelChart(
      {
        from: '2026-10-01',
        to: '2026-10-08',
        population: '',
        steps: [
          { step: 'visited', count: 0 },
          { step: 'played', count: 0 },
        ],
      },
      INK,
    ) as { yAxis: { data: string[] } };

    expect(option.yAxis.data).toEqual(['Played a game', 'Visited']);
  });
});

describe('retentionChart', () => {
  it('leaves out empty cohorts and marks return days not final yet', () => {
    const option = retentionChart(
      {
        kind: 'VISITOR',
        version: 1,
        cohorts: [
          { cohortDay: '2026-10-01', size: 0, offsets: [] },
          {
            cohortDay: '2026-10-02',
            size: 10,
            offsets: [
              { offsetDays: 1, retained: 3, rate: 0.3, mature: true },
              { offsetDays: 7, retained: null, rate: null, mature: false },
            ],
          },
        ],
      },
      INK,
    ) as { yAxis: { data: string[] }; series: { data: { value: unknown[] }[] }[] };

    expect(option.yAxis.data).toHaveLength(1);
    expect(option.series[0]?.data.map((cell) => cell.value[2])).toEqual([30, '-', '-']);
  });
});
