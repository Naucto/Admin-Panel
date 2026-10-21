# AGENTS.md

Guidance for agents and contributors working on the Naucto admin console. The README says what it
is and how to run it; this file is how the code is laid out and what to keep in mind.

## Layout

| Path               | Purpose                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/core`     | Session (`auth.store.ts`), API access (`api.service.ts`, `analytics.api.ts`, `accounts.api.ts`), the response types (`types.ts`), shared filters, dates, metric labels and units |
| `src/app/charts`   | ECharts setup, the theme read from the tokens, and pure option builders (`options.ts`)                                                                                           |
| `src/app/ui`       | The console's small kit: panel, stat tile, segmented control, chart directive, breakdown view, icons, confirmations and toasts                                                   |
| `src/app/features` | One folder per page, each lazily loaded                                                                                                                                          |
| `src/styles`       | `naucto-tokens.css`, copied from the Naucto Frontend                                                                                                                             |
| `nginx/`           | The production server and its `/api` proxy                                                                                                                                       |

## Conventions

- Standalone components, `OnPush`, signals, `input()`/`model()`, `inject()`. Server data is loaded
  with Angular's `resource()`; `ui/panel-state.ts` turns one into what a panel shows.
- A chart is a pure builder from a response to an ECharts option. Pass the chart directive a
  function of the theme's ink (`(ink) => trendChart(lines, grain, ink)`) so it redraws on a theme
  switch.
- Every panel decides its empty state. Early on most views have little data, and a panel must say
  what it is waiting for instead of drawing a flat line or a sliver.
- Colours come from the tokens (`--nc-*` and their Tailwind names), or from `charts/palette.ts` for
  series. Running text is in the system face; labels, headings and figures in Naucto's LCD faces.
- `naucto-tokens.css`, `ui/icon-paths.ts` and `ui/logo.component.svg` are copies from the Naucto
  Frontend (`packages/ui`). Refresh them by copying again, never by editing here.
- `core/types.ts` mirrors the backend's `admin/*` responses by hand. When the backend contract
  changes, change it in the same branch.
- No inline scripts and no third-party origins: the production CSP refuses both. That is also why
  critical CSS inlining is off in `angular.json`.
- Component selectors, directives and global classes take the `nc` prefix (`nc-panel`,
  `ncChart`, `.nc-button`). Never name anything `ad-…`, `ads`, `banner` or `sponsor`: ad blockers
  (Opera's built-in one, uBlock, AdBlock) hide elements by such names through EasyList's generic
  rules (`##.ad-button`, `##.ad-panel`), and the console would lose its sign-in button and panels
  for everyone running one.
- Commits: `[ADMIN] [TYPE] Capitalized message`, TYPE among ADD/REMOVE/UPDATE/REFACTO/CLEAN/FIX,
  with the Jira key in the body (`Refs NCTO-276`). Branch = Jira key.

## Timeline, posts and compare

These pages read the backend's raw timeline (`core/timeline.api.ts`) between two instants rather
than the rollups between two days. They have their own window, so their routes are not stats pages
and the top bar's range does not apply.

- `core/time-range.store.ts` holds the window all three share: a preset that follows the clock, or
  a fixed window. Zooming keeps the windows it left, so the reader can step back. The Timeline also
  takes `?from=…&to=…&game=…` so other pages can link to a stretch.
- `core/timeline-catalog.ts` names every timeline metric and gives it a colour of its own, which it
  keeps on every chart. Browsers that accepted analytics, tabs that declined it and signed-in tabs
  that declined it always wear `CONSENT_COLOURS`. `TIMELINE_ROWS` groups series that share a unit,
  so each row has one axis. A series that would need a second axis gets a row of its own, and
  Compare reads different sizes as a share of their own peak instead.
- The timeline chart selects a stretch with the ECharts brush. `ChartDirective` takes
  `ncChartEvents` for the events and `ncChartAfterDraw` to arm the brush again after each draw,
  since `notMerge` drops it.
- `core/impact.ts` compares the hours after a post with the median of the same hours of the same
  weekday in the three weeks before, falling back on the hours just before when no earlier week is kept. It is
  pure, so its arithmetic is tested apart from the page.
- A game is always chosen through `nc-game-picker`, which searches the backend a few at a time.
  Never put every game in a `<select>`: the list only grows.
- Posts falling on the same point of an axis draw one line (`charts/markers.ts`), labelled with how
  many share it. `MarkerVisibilityStore` holds the posts an admin hid, and every chart drawing
  posts reads them through it, so `nc-marker-filter` hides a post everywhere at once.
- Saved Compare charts, the chosen Timeline rows and the hidden posts live in `localStorage`, a
  convenience of one browser. Posts themselves are server data (`admin/analytics/markers`).

## Before finishing

`npm run typecheck && npm test && npm run build`, and `npm run format:check`.
