import { addDays, daysBetween, grainFor, periodLabel } from './dates';
import { formatDuration, formatMetric } from './metric-catalog';

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
