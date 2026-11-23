import { addDays, dayTime, daysBetween, grainFor, periodLabel, shortAgo } from './dates';
import { idOf, shortId } from './ids';
import { MarkerVisibilityStore } from './marker-visibility.store';
import { formatDuration, formatMetric } from './metric-catalog';
import {
  BUG_CATEGORY_LABELS,
  BUG_STATUS_LABELS,
  BUG_VIEW_LABELS,
  bugContextRows,
  bugStatusChip,
  compactPairs,
  crashStatusChip,
  formatAverage,
  formatBytes,
  formatShare,
  optionsOf,
  runtimeLine,
  scoreChip,
  scoreInk,
} from './support-format';

const GAME = '3f2b8c1e-9d4a-4e6f-8a7b-1c2d3e4f5a6b';

describe('ids', () => {
  it('reads an id from outside the API in the lower case the backend answers', () => {
    expect(idOf(GAME)).toBe(GAME);
    expect(idOf(GAME.toUpperCase())).toBe(GAME);
  });

  it('reads no id from a number, a short form or anything around one', () => {
    expect(idOf(12)).toBeUndefined();
    expect(idOf('12')).toBeUndefined();
    expect(idOf('3f2b8c1e')).toBeUndefined();
    expect(idOf(`#${GAME}`)).toBeUndefined();
    expect(idOf(`${GAME} `)).toBeUndefined();
    expect(idOf('')).toBeUndefined();
    expect(idOf(undefined)).toBeUndefined();
    expect(idOf(null)).toBeUndefined();
  });

  it('shows an id by its first eight characters', () => {
    expect(shortId(GAME)).toBe('3f2b8c1e');
  });
});

describe('hidden posts', () => {
  const KEY = 'nc-hidden-markers';
  const storage = new Map<string, string>();
  const stored = (value: string): ReadonlySet<string> => {
    storage.set(KEY, value);
    return new MarkerVisibilityStore().hidden();
  };

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the posts hidden by id', () => {
    expect([...stored(JSON.stringify([GAME]))]).toEqual([GAME]);
  });

  it('leaves out what was stored as a number, without an error', () => {
    expect([...stored(JSON.stringify([4, '7', GAME, null]))]).toEqual([GAME]);
    expect(stored('[4, 7]').size).toBe(0);
    expect(stored('{"4":true}').size).toBe(0);
    expect(stored('not json').size).toBe(0);
  });

  it('stores what is hidden now, so what it left out goes at the first change', () => {
    const store = new MarkerVisibilityStore();
    storage.set(KEY, '[4, 7]');
    store.toggle(GAME);

    expect(storage.get(KEY)).toBe(JSON.stringify([GAME]));
  });
});

describe('dates', () => {
  it('counts both ends of a range', () => {
    expect(daysBetween('2026-10-01', '2026-10-30')).toBe(30);
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });

  it('picks a grain that keeps a chart readable', () => {
    expect(grainFor(30)).toBe('DAY');
    expect(grainFor(90)).toBe('WEEK');
    expect(grainFor(365)).toBe('MONTH');
  });

  it('reads an age in the largest short unit', () => {
    const now = Date.parse('2026-10-19T12:00:00Z');

    expect(shortAgo('2026-10-19T11:59:30Z', now)).toBe('just now');
    expect(shortAgo('2026-10-19T11:15:00Z', now)).toBe('45 min ago');
    expect(shortAgo('2026-10-19T09:00:00Z', now)).toBe('3 h ago');
    expect(shortAgo('2026-10-16T12:00:00Z', now)).toBe('3 d ago');
    expect(shortAgo('2026-07-19T12:00:00Z', now)).toBe('3 mo ago');
    expect(shortAgo('2024-10-19T12:00:00Z', now)).toBe('2 y ago');
    expect(shortAgo('2026-10-19T12:05:00Z', now)).toBe('just now');
  });

  it('reads a moment as its UTC day and time', () => {
    expect(dayTime('2026-10-05T07:04:00Z')).toBe('5 Oct 2026, 07:04');
  });

  it('labels a period by its grain', () => {
    expect(periodLabel('2026-10-05', 'DAY')).toBe('5 Oct');
    expect(periodLabel('2026-10-05', 'WEEK')).toBe('wk 5 Oct');
    expect(periodLabel('2026-10-01', 'MONTH')).toBe('Oct 2026');
  });
});

describe('formatting', () => {
  it('reads durations in the largest short unit', () => {
    expect(formatDuration(42)).toBe('42 s');
    expect(formatDuration(12 * 60)).toBe('12 min');
    expect(formatDuration(3.4 * 3600)).toBe('3.4 h');
    expect(formatDuration(1204 * 3600)).toBe('1,204 h');
  });

  it('formats each metric in its own unit, and a missing value as a dash', () => {
    expect(formatMetric('playtime_ms', 90 * 60_000)).toBe('1.5 h');
    expect(formatMetric('session_seconds_median', 95)).toBe('2 min');
    expect(formatMetric('bounce_rate', 42.25)).toBe('42.3%');
    expect(formatMetric('visitors', 12_345, true)).toBe('12.3K');
    expect(formatMetric('visitors', null)).toBe('--');
  });
});

describe('support formatting', () => {
  it('marks scores of 4 or less as low and 8 or more as high', () => {
    expect(scoreChip(1)).toBe('nc-chip nc-chip-warn');
    expect(scoreChip(4)).toBe('nc-chip nc-chip-warn');
    expect(scoreChip(5)).toBe('nc-chip');
    expect(scoreChip(7)).toBe('nc-chip');
    expect(scoreChip(8)).toBe('nc-chip nc-chip-gold');
    expect(scoreChip(10)).toBe('nc-chip nc-chip-gold');
    expect(scoreInk(3)).toBe('text-orange-ink');
    expect(scoreInk(9)).toBe('text-gold-ink');
  });

  it('chips a bug as waiting, being worked on, fixed or set aside', () => {
    expect(bugStatusChip('NEW')).toBe('nc-chip nc-chip-warn');
    expect(bugStatusChip('TRIAGED')).toBe('nc-chip nc-chip-gold');
    expect(bugStatusChip('IN_PROGRESS')).toBe('nc-chip nc-chip-gold');
    expect(bugStatusChip('RESOLVED')).toBe('nc-chip nc-chip-ok');
    expect(bugStatusChip('IGNORED')).toBe('nc-chip nc-chip-quiet');
  });

  it('chips a crash group by its status', () => {
    expect(crashStatusChip('OPEN')).toBe('nc-chip nc-chip-warn');
    expect(crashStatusChip('RESOLVED')).toBe('nc-chip nc-chip-ok');
    expect(crashStatusChip('IGNORED')).toBe('nc-chip nc-chip-quiet');
  });

  it('labels every view, category and status, in the order the filters show them', () => {
    expect(optionsOf(BUG_VIEW_LABELS).map((option) => option.label)).toEqual([
      'New',
      'Open',
      'Closed',
      'All',
    ]);
    expect(optionsOf(BUG_CATEGORY_LABELS).map((option) => option.value)).toEqual([
      'GAMEPLAY',
      'EDITOR',
      'GRAPHICS',
      'SOUND',
      'NETPLAY',
      'ACCOUNT',
      'PERFORMANCE',
      'OTHER',
    ]);
    expect(BUG_CATEGORY_LABELS.NETPLAY).toBe('Multiplayer');
    expect(BUG_STATUS_LABELS.IGNORED).toBe('Ignored');
  });

  it('reads averages out of 10, shares as percents and sizes in bytes', () => {
    expect(formatAverage(7.36)).toBe('7.4 / 10');
    expect(formatAverage(null)).toBe('--');
    expect(formatShare(0.125)).toBe('13%');
    expect(formatShare(null)).toBe('--');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(150_000)).toBe('146 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('writes an extra as key=value pairs and leaves empty values out', () => {
    expect(compactPairs({ kind: 'webgl-context-lost', phase: 'draw', audio: null, code: 3 })).toBe(
      'kind=webgl-context-lost phase=draw code=3',
    );
    expect(compactPairs(null)).toBe('');
    expect(runtimeLine({ browser: 'Firefox', os: null, device: 'desktop' })).toBe(
      'Firefox · desktop',
    );
  });

  it('lists the context a report carried and skips what it did not', () => {
    const rows = bugContextRows({
      route: '/play/42',
      release: { id: GAME, name: 'Cave' },
      context: { viewport: '1920x1080', browser: 'Chrome', language: '' },
    });

    expect(rows).toEqual([
      { label: 'Page', value: '/play/42' },
      { label: 'Game', value: 'Cave 3f2b8c1e' },
      { label: 'Viewport', value: '1920x1080' },
      { label: 'Browser', value: 'Chrome' },
    ]);
  });
});
