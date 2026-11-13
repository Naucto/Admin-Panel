import { instantLabel } from '../core/instants';
import type { Marker } from '../core/types';
import { escape } from './html';
import { CHART_FONT_MONO, type ChartInk } from './palette';

const LABEL_LENGTH = 22;

const AUDIENCE_NAMES: Record<Marker['audience'], string> = {
  EVERYONE: 'Everyone',
  PLAYERS: 'Players',
  CREATORS: 'Creators',
};

export interface MarkerGroup {
  /** The category index the posts fall on. */
  index: number;
  markers: Marker[];
}

/**
 * Posts falling on the same point of an axis, together, so several posts of the same hour draw
 * one line with one label instead of labels on top of each other.
 */
export function groupMarkers(
  markers: readonly Marker[],
  indexOf: (at: number) => number,
): MarkerGroup[] {
  const groups = new Map<number, Marker[]>();
  for (const marker of markers) {
    const index = indexOf(Date.parse(marker.at));
    if (index >= 0) {
      groups.set(index, [...(groups.get(index) ?? []), marker]);
    }
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, grouped]) => ({ index, markers: grouped }));
}

/** `Trailer`, or `Trailer +2` when two more posts share its point. */
export function groupLabel(group: MarkerGroup): string {
  const [first, ...rest] = group.markers;
  const label = first?.label ?? '';
  const short = label.length > LABEL_LENGTH ? `${label.slice(0, LABEL_LENGTH - 1)}…` : label;
  return rest.length > 0 ? `${short} +${String(rest.length)}` : short;
}

/** An ECharts mark line drawing each group of posts as one vertical line. */
export function markerLineOption(
  groups: readonly MarkerGroup[],
  ink: ChartInk,
  labelled: boolean,
): object | undefined {
  if (groups.length === 0) {
    return undefined;
  }
  return {
    silent: false,
    symbol: ['none', 'none'],
    lineStyle: { color: ink.ink2, width: 1, type: 'solid', opacity: 0.8 },
    label: {
      position: 'end',
      color: ink.ink,
      fontFamily: CHART_FONT_MONO,
      fontSize: 9,
      backgroundColor: ink.raised,
      padding: [2, 4],
      borderRadius: 2,
    },
    emphasis: { lineStyle: { width: 2 } },
    tooltip: {
      trigger: 'item',
      formatter: ({ dataIndex }: { dataIndex: number }) =>
        (groups[dataIndex]?.markers ?? [])
          .map(
            (marker) =>
              `<div style="margin-bottom:4px"><b>${escape(marker.label)}</b><br>` +
              `<span style="opacity:.7">${escape(instantLabel(marker.at))} UTC` +
              (marker.channel ? ` · ${escape(marker.channel)}` : '') +
              ` · ${AUDIENCE_NAMES[marker.audience]}` +
              (marker.game ? ` · ${escape(marker.game)}` : '') +
              `</span></div>`,
          )
          .join(''),
    },
    data: groups.map((group) => ({
      xAxis: group.index,
      label: { show: labelled, formatter: groupLabel(group) },
    })),
  };
}
