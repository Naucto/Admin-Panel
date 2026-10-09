import type { Point, Series } from '../core/types';

/**
 * A series computed from two others period by period, such as a rate. A period where either side
 * has no value, or the denominator is 0, has none either rather than a misleading 0.
 */
export function combine(
  metric: string,
  numerator: Series,
  denominator: Series,
  compute: (top: number, bottom: number) => number,
): Series {
  const points: Point[] = numerator.points.map((point, index) => {
    const other = denominator.points[index];
    const usable =
      point.value !== null &&
      other?.value !== null &&
      other?.value !== undefined &&
      other.value > 0;
    return {
      ...point,
      status:
        point.status === 'unavailable' || other?.status === 'unavailable'
          ? 'unavailable'
          : point.status === 'provisional' || other?.status === 'provisional'
            ? 'provisional'
            : 'final',
      value: usable ? compute(point.value ?? 0, other.value ?? 1) : null,
    };
  });
  return { ...numerator, metric, points };
}
