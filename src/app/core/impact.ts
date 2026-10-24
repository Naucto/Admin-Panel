import { WEEK_MS } from './instants';
import type { Timeline, TimelineMetric } from './types';

/** How many earlier weeks the usual level of a window is read from, when they are kept. */
export const BASELINE_WEEKS = 3;

export type BaselineKind = 'weeks' | 'before';

export interface Impact {
  /** What the window after the post counted. */
  after: number | null;
  /** What such a window usually counts: the median of the same hours in earlier weeks. */
  baseline: number | null;
  baselineKind: BaselineKind | null;
  /** Earlier weeks the baseline was read from. */
  weeks: number;
  difference: number | null;
  /** The difference as a share of the baseline; null when the baseline is 0. */
  lift: number | null;
  /** How much of the window has happened yet, from 0 to 1. */
  elapsed: number;
}

export interface CumulativeCurve {
  /** Hours since the post at the end of each bucket. */
  hours: number[];
  actual: (number | null)[];
  usual: (number | null)[];
}

/**
 * The middle of some values, so one earlier week with a post of its own does not pass for usual.
 * With two values it is their mean.
 */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Values of a metric over buckets, read straight from a timeline answer. */
export function valuesOf(timeline: Timeline, metric: TimelineMetric): (number | null)[] {
  return timeline.series.find((series) => series.metric === metric)?.values ?? [];
}

/** A series made of others added bucket by bucket; a bucket missing in any is missing. */
export function addValues(...series: (number | null)[][]): (number | null)[] {
  const length = Math.max(0, ...series.map((one) => one.length));
  return Array.from({ length }, (_, index) => {
    let sum = 0;
    for (const one of series) {
      const value = one[index];
      if (value === null || value === undefined) {
        return null;
      }
      sum += value;
    }
    return sum;
  });
}

/**
 * The sum of the buckets starting in `[from, to)`, or null when any of them has no value (before
 * the raw window, or not happened yet) or none is there.
 */
export function windowSum(
  starts: readonly number[],
  values: readonly (number | null)[],
  from: number,
  to: number,
): number | null {
  let sum = 0;
  let seen = 0;
  for (let index = 0; index < starts.length; index++) {
    const start = starts[index]!;
    if (start < from || start >= to) {
      continue;
    }
    const value = values[index];
    if (value === null || value === undefined) {
      return null;
    }
    sum += value;
    seen += 1;
  }
  return seen > 0 ? sum : null;
}

/** The end of the last bucket that has a value, so a window still under way is cut there. */
function knownUntil(
  starts: readonly number[],
  values: readonly (number | null)[],
  bucketMs: number,
): number {
  for (let index = values.length - 1; index >= 0; index--) {
    if (values[index] !== null && values[index] !== undefined) {
      return starts[index]! + bucketMs;
    }
  }
  return starts[0] ?? 0;
}

/**
 * What a post changed in a metric: the window after it against the same hours of the weekday in
 * the weeks before, which keeps the time of day and the day of the week out of the comparison.
 * Where no earlier week is kept, the window right before the post stands in. A window still under
 * way is compared over the part that has happened.
 */
export function impactOf(
  starts: readonly number[],
  values: readonly (number | null)[],
  bucketMs: number,
  at: number,
  windowMs: number,
): Impact {
  const from = Math.floor(at / bucketMs) * bucketMs;
  const end = Math.min(from + windowMs, knownUntil(starts, values, bucketMs));
  const length = Math.max(0, end - from);
  const elapsed = windowMs > 0 ? Math.min(1, length / windowMs) : 0;
  const after = length > 0 ? windowSum(starts, values, from, end) : null;

  const weeks: number[] = [];
  for (let week = 1; week <= BASELINE_WEEKS; week++) {
    const sum = windowSum(starts, values, from - week * WEEK_MS, end - week * WEEK_MS);
    if (sum !== null) {
      weeks.push(sum);
    }
  }
  let baseline: number | null = null;
  let baselineKind: BaselineKind | null = null;
  if (weeks.length > 0) {
    baseline = median(weeks);
    baselineKind = 'weeks';
  } else if (length > 0) {
    baseline = windowSum(starts, values, from - length, from);
    baselineKind = baseline === null ? null : 'before';
  }

  const difference = after !== null && baseline !== null ? after - baseline : null;
  return {
    after,
    baseline,
    baselineKind,
    weeks: weeks.length,
    difference,
    lift: difference !== null && baseline ? difference / baseline : null,
    elapsed,
  };
}

/**
 * The running total after the post, bucket by bucket, beside the running total of the same hours
 * in the earlier weeks, the median of the weeks that are kept.
 */
export function cumulativeOf(
  starts: readonly number[],
  values: readonly (number | null)[],
  bucketMs: number,
  at: number,
  windowMs: number,
): CumulativeCurve {
  const from = Math.floor(at / bucketMs) * bucketMs;
  const index = new Map(starts.map((start, position) => [start, position]));
  const valueAt = (start: number): number | null => {
    const position = index.get(start);
    return position === undefined ? null : (values[position] ?? null);
  };
  const steps = Math.max(1, Math.round(windowMs / bucketMs));
  const hours: number[] = [];
  const actual: (number | null)[] = [];
  const usual: (number | null)[] = [];
  let actualSum: number | null = 0;
  const weekSums: (number | null)[] = Array.from({ length: BASELINE_WEEKS }, () => 0);

  for (let step = 0; step < steps; step++) {
    const start = from + step * bucketMs;
    hours.push(((step + 1) * bucketMs) / 3_600_000);
    const value = valueAt(start);
    actualSum = actualSum === null || value === null ? null : actualSum + value;
    actual.push(actualSum);
    for (let week = 0; week < BASELINE_WEEKS; week++) {
      const earlier = valueAt(start - (week + 1) * WEEK_MS);
      const sum = weekSums[week] ?? null;
      weekSums[week] = sum === null || earlier === null ? null : sum + earlier;
    }
    const kept = weekSums.filter((sum): sum is number => sum !== null);
    usual.push(kept.length > 0 ? median(kept) : null);
  }
  return { hours, actual, usual };
}
