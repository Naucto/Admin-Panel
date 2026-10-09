/** Naucto's accent fills, in the order a chart hands them to its series. Identical in both themes. */
export const SERIES_COLOURS = [
  '#ffd100', // gold
  '#68aed4', // sky
  '#ff2674', // hot
  '#10d275', // jade
  '#ff8426', // orange
  '#ff80a4', // blush
  '#bfff3c', // lime
  '#94216a', // magenta
] as const;

export const ACTIVITY_COLOURS = {
  playing: '#10d275',
  building: '#68aed4',
  hosting: '#ff8426',
  browsing: '#ffd100',
} as const;

/** The theme colours a chart draws its frame with, read from the tokens of the page. */
export interface ChartInk {
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  lineSoft: string;
  panel: string;
  raised: string;
  page: string;
}

export function readInk(element: Element = document.documentElement): ChartInk {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string): string =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    ink: read('--nc-ink', '#ede6da'),
    ink2: read('--nc-ink-2', '#9c9287'),
    ink3: read('--nc-ink-3', '#8a8177'),
    line: read('--nc-line', '#2a2621'),
    lineSoft: read('--nc-line-faint', '#17140f'),
    panel: read('--nc-panel', '#131110'),
    raised: read('--nc-raised', '#1c1917'),
    page: read('--nc-page', '#0b0a09'),
  };
}

export const CHART_FONT_MONO = "'HD44780 Mono', ui-monospace, monospace";
export const CHART_FONT_TEXT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
