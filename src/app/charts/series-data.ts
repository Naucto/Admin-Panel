import type { Point, Series } from '../core/types';

/**
 * How much a set of series has to show. `empty`: no period has a value. `zero`: every value is 0,
 * which is worth saying rather than drawing a flat line. `sparse`: three or fewer periods have a
 * value, too few for a line to mean anything. `full`: enough to draw a trend.
 */
export type DataShape = 'empty' | 'zero' | 'sparse' | 'full';

export const SPARSE_LIMIT = 3;

export function valued(points: readonly Point[]): Point[] {
  return points.filter((point) => point.value !== null && point.status !== 'unavailable');
}

export function shapeOf(series: readonly Series[]): DataShape {
  const counts = series.map((one) => valued(one.points));
  if (counts.every((points) => points.length === 0)) {
    return 'empty';
  }
  if (counts.every((points) => points.every((point) => point.value === 0))) {
    return 'zero';
  }
  const periods = new Set(
    counts.flatMap((points) =>
      points.filter((point) => point.value !== 0).map((point) => point.periodStart),
    ),
  );
  return periods.size <= SPARSE_LIMIT ? 'sparse' : 'full';
}

export function total(series: Series): number {
  return valued(series.points).reduce((sum, point) => sum + (point.value ?? 0), 0);
}

/** The latest valued point, as a headline number beside a chart. */
export function latest(series: Series): Point | undefined {
  return valued(series.points).at(-1);
}

/** Index of the first period still provisional, from which on the chart shades its values. */
export function firstProvisional(points: readonly Point[]): number {
  return points.findIndex((point) => point.status === 'provisional');
}

/** A share, or null when there is nothing to divide by. */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}
