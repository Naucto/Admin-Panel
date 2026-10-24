import { addValues, cumulativeOf, impactOf, median, windowSum } from '../core/impact';
import { fromUtcInput, HOUR_MS, toUtcInput, WEEK_MS } from '../core/instants';
import { bucketFor, bucketsFor, metricsOfRows, TIMELINE_ROWS } from '../core/timeline-catalog';
import type { Marker, Timeline } from '../core/types';
import { requestGroups } from '../features/compare/compare.page';
import { defaultCurve, type ImpactRow, orderRows } from '../features/posts/posts.page';
import { groupLabel, groupMarkers } from './markers';
import type { ChartInk } from './palette';
import { bucketIndexOf, rowSeries, timelineChart } from './timeline-options';

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

const POST = Date.parse('2026-10-21T18:20:00Z');
const HOUR_OF_POST = Date.parse('2026-10-21T18:00:00Z');

/** Hourly buckets from three weeks before the post's hour to `after` hours past it. */
function hourly(
  value: (start: number) => number | null,
  after: number,
): { starts: number[]; values: (number | null)[] } {
  const starts: number[] = [];
  for (let at = HOUR_OF_POST - 3 * WEEK_MS; at < HOUR_OF_POST + after * HOUR_MS; at += HOUR_MS) {
    starts.push(at);
  }
  return { starts, values: starts.map(value) };
}

describe('impact of a post', () => {
  it('compares the window after it with the same hours of the weeks before', () => {
    const { starts, values } = hourly((start) => (start >= HOUR_OF_POST ? 10 : 2), 6);

    const impact = impactOf(starts, values, HOUR_MS, POST, 6 * HOUR_MS);

    expect(impact).toMatchObject({
      after: 60,
      baseline: 12,
      baselineKind: 'weeks',
      weeks: 3,
      difference: 48,
      lift: 4,
      elapsed: 1,
    });
  });

  it('compares a window still under way over the part that has happened', () => {
    const { starts, values } = hourly(
      (start) => (start >= HOUR_OF_POST + 2 * HOUR_MS ? null : 3),
      6,
    );

    const impact = impactOf(starts, values, HOUR_MS, POST, 6 * HOUR_MS);

    expect(impact.after).toBe(6);
    expect(impact.baseline).toBe(6);
    expect(impact.elapsed).toBeCloseTo(2 / 6);
  });

  it('falls back on the hours just before when no earlier week is kept', () => {
    const { starts, values } = hourly(
      (start) => (start < HOUR_OF_POST - 6 * HOUR_MS ? null : start < HOUR_OF_POST ? 1 : 4),
      6,
    );

    const impact = impactOf(starts, values, HOUR_MS, POST, 6 * HOUR_MS);

    expect(impact.baselineKind).toBe('before');
    expect(impact.baseline).toBe(6);
    expect(impact.after).toBe(24);
  });

  it('has no lift over a baseline of nothing, only a difference', () => {
    const { starts, values } = hourly((start) => (start >= HOUR_OF_POST ? 1 : 0), 2);

    const impact = impactOf(starts, values, HOUR_MS, POST, 2 * HOUR_MS);

    expect(impact.difference).toBe(2);
    expect(impact.lift).toBeNull();
  });

  it('draws the running total beside the usual running total', () => {
    const { starts, values } = hourly((start) => (start >= HOUR_OF_POST ? 5 : 1), 3);

    const curve = cumulativeOf(starts, values, HOUR_MS, POST, 3 * HOUR_MS);

    expect(curve.hours).toEqual([1, 2, 3]);
    expect(curve.actual).toEqual([5, 10, 15]);
    expect(curve.usual).toEqual([1, 2, 3]);
  });

  it('reads the usual level as the median week, so one week with its own post is ignored', () => {
    const { starts, values } = hourly((start) => {
      if (start >= HOUR_OF_POST) {
        return 10;
      }
      const twoWeeksBefore = HOUR_OF_POST - 2 * WEEK_MS;
      return start >= twoWeeksBefore && start < twoWeeksBefore + 6 * HOUR_MS ? 50 : 2;
    }, 6);

    expect(impactOf(starts, values, HOUR_MS, POST, 6 * HOUR_MS).baseline).toBe(12);
    expect(median([4, 1, 9])).toBe(4);
    expect(median([2, 8])).toBe(5);
  });

  it('adds series bucket by bucket, and a bucket missing anywhere is missing', () => {
    expect(addValues([1, 2, null], [3, 4, 5])).toEqual([4, 6, null]);
  });

  it('sums no window it cannot see entirely', () => {
    expect(windowSum([0, 10, 20], [1, null, 3], 0, 30)).toBeNull();
    expect(windowSum([0, 10, 20], [1, 2, 3], 10, 30)).toBe(5);
    expect(windowSum([0, 10, 20], [1, 2, 3], 40, 50)).toBeNull();
  });
});

describe('timeline buckets', () => {
  it('picks the finest bucket that stays readable', () => {
    expect(bucketFor(6 * HOUR_MS)).toBe('1m');
    expect(bucketFor(48 * HOUR_MS)).toBe('15m');
    expect(bucketFor(30 * 24 * HOUR_MS)).toBe('6h');
  });

  it('offers only buckets the backend takes and that draw at least two points', () => {
    expect(bucketsFor(HOUR_MS)).toEqual(['1m', '5m', '15m']);
    expect(bucketsFor(90 * 24 * HOUR_MS)).toEqual(['6h', '1d']);
  });

  it('reads date fields as UTC', () => {
    expect(fromUtcInput('2026-10-21T18:20')).toBe(POST);
    expect(toUtcInput(POST)).toBe('2026-10-21T18:20');
    expect(fromUtcInput('2026-10-21')).toBeNull();
  });
});

describe('the timeline chart', () => {
  const timeline: Timeline = {
    from: '2026-10-21T18:00:00.000Z',
    to: '2026-10-21T21:00:00.000Z',
    bucket: '1h',
    bucketMs: HOUR_MS,
    rawFrom: '2026-07-23T00:00:00.000Z',
    buckets: ['2026-10-21T18:00:00.000Z', '2026-10-21T19:00:00.000Z', '2026-10-21T20:00:00.000Z'],
    series: [
      {
        metric: 'signups',
        population: 'SERVER',
        combine: 'sum',
        definition: '',
        ignoredFilters: [],
        values: [3, 1, null],
        total: 4,
      },
      {
        metric: 'signups_unlinked',
        population: 'SERVER',
        combine: 'sum',
        definition: '',
        ignoredFilters: [],
        values: [1, 1, null],
        total: 2,
      },
    ],
  };
  const accounts = TIMELINE_ROWS.find((row) => row.key === 'accounts')!;

  it('asks for what derived series are computed from', () => {
    expect(metricsOfRows([accounts])).toEqual(['signups', 'signups_unlinked']);
  });

  it('splits accounts into those linked to an accepting browser and the rest', () => {
    expect(rowSeries(accounts, timeline).map((series) => series.values)).toEqual([
      [2, 0, null],
      [1, 1, null],
    ]);
  });

  it('shows anonymous plays whose answer was not sent only when there are some', () => {
    const plays = TIMELINE_ROWS.find((row) => row.key === 'plays')!;
    const series = (metric: string, values: (number | null)[]): Timeline['series'][number] => ({
      metric: metric as Timeline['series'][number]['metric'],
      population: 'ANONYMOUS',
      combine: 'sum',
      definition: '',
      ignoredFilters: [],
      values,
      total: null,
    });
    const answered = {
      ...timeline,
      series: [
        series('plays_consented', [1, 1, null]),
        series('plays_anonymous', [3, 2, null]),
        series('plays_declined', [2, 1, null]),
        series('plays_unanswered', [1, 1, null]),
      ],
    };
    const unsent = {
      ...answered,
      series: [
        ...answered.series.slice(0, 1),
        series('plays_anonymous', [5, 2, null]),
        ...answered.series.slice(2),
      ],
    };

    expect(metricsOfRows([plays])).toEqual([
      'plays_consented',
      'plays_declined',
      'plays_unanswered',
      'plays_anonymous',
    ]);
    expect(rowSeries(plays, answered).map((one) => one.name)).toEqual([
      'Plays · accepted',
      'Plays · declined',
      'Plays · not answered',
    ]);
    expect(rowSeries(plays, unsent).at(-1)?.values).toEqual([2, 0, null]);
  });

  it('places a post in its bucket and leaves out one outside the window', () => {
    expect(bucketIndexOf(timeline, POST)).toBe(0);
    expect(bucketIndexOf(timeline, Date.parse('2026-10-22T00:00:00Z'))).toBe(-1);
  });

  it('gives every row its own grid and axis, and draws posts on each', () => {
    const marker: Marker = {
      id: 1,
      at: '2026-10-21T19:30:00.000Z',
      label: 'Trailer',
      channel: 'YouTube',
      url: null,
      audience: 'PLAYERS',
      releaseId: null,
      game: null,
      createdAt: '',
      updatedAt: '',
    };
    const plays = TIMELINE_ROWS.find((row) => row.key === 'plays')!;
    const option = timelineChart(timeline, [accounts, plays], [marker], INK) as {
      grid: unknown[];
      yAxis: unknown[];
      series: { markLine?: { data: { xAxis: number }[] } }[];
    };

    expect(option.grid).toHaveLength(2);
    expect(option.yAxis).toHaveLength(2);
    const marked = option.series.filter((series) => series.markLine);
    expect(marked).toHaveLength(2);
    expect(marked[0]?.markLine?.data[0]?.xAxis).toBe(1);
  });
});

describe('compare requests', () => {
  it('asks once per game and source, with every metric of that group', () => {
    const groups = requestGroups([
      { id: 1, metric: 'visitors_new', releaseId: null, source: null, colour: 'a' },
      { id: 2, metric: 'plays_consented', releaseId: 9, source: null, colour: 'b' },
      { id: 3, metric: 'plays_anonymous', releaseId: 9, source: null, colour: 'c' },
      { id: 4, metric: 'sessions', releaseId: null, source: null, colour: 'd' },
    ]);

    expect(groups).toEqual([
      { releaseId: null, source: null, metrics: ['visitors_new', 'sessions'] },
      { releaseId: 9, source: null, metrics: ['plays_consented', 'plays_anonymous'] },
    ]);
  });
});

const post = (id: number, at: string, label: string): Marker => ({
  id,
  at,
  label,
  channel: null,
  url: null,
  audience: 'EVERYONE',
  releaseId: null,
  game: null,
  createdAt: '',
  updatedAt: '',
});

describe('posts on a chart', () => {
  it('draws posts of the same point as one line, labelled with how many share it', () => {
    const groups = groupMarkers(
      [
        post(1, '2026-10-21T18:05:00Z', 'Trailer'),
        post(2, '2026-10-21T18:40:00Z', 'Reddit thread'),
        post(3, '2026-10-21T20:00:00Z', 'A rather long title for a single post on TikTok'),
        post(4, '2026-10-30T00:00:00Z', 'Outside'),
      ],
      (at) => {
        const index = Math.floor((at - Date.parse('2026-10-21T18:00:00Z')) / HOUR_MS);
        return index < 24 ? index : -1;
      },
    );

    expect(groups.map((group) => group.index)).toEqual([0, 2]);
    expect(groups.map(groupLabel)).toEqual(['Trailer +1', 'A rather long title f…']);
  });
});

describe('the impact of a post', () => {
  const row = (key: string): ImpactRow => ({
    key,
    label: key,
    colour: '',
    values: [],
    impact: {
      after: null,
      baseline: null,
      baselineKind: null,
      weeks: 0,
      difference: null,
      lift: null,
      elapsed: 0,
    },
  });

  it('reads a post for creators by accounts, projects and forks first', () => {
    const rows = [
      'visitors_new',
      'plays_all',
      'projects_forked',
      'signups',
      'projects_created',
    ].map(row);

    expect(orderRows(rows, 'CREATORS').map((one) => one.key)).toEqual([
      'signups',
      'projects_created',
      'projects_forked',
      'visitors_new',
      'plays_all',
    ]);
  });

  it('opens on the game when the post is about one', () => {
    expect(defaultCurve({ ...post(1, '', ''), audience: 'PLAYERS', releaseId: 9 })).toBe(
      'game:plays_all',
    );
    expect(defaultCurve({ ...post(1, '', ''), audience: 'CREATORS', releaseId: 9 })).toBe(
      'game:projects_forked',
    );
    expect(defaultCurve({ ...post(1, '', ''), audience: 'CREATORS' })).toBe('projects_created');
  });
});
