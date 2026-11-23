# AGENTS.md

Guidance for agents and contributors working on the Naucto admin console. The README says what it
is and how to run it; this file is how the code is laid out and what to keep in mind.

## Layout

| Path               | Purpose                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/core`     | Session (`auth.store.ts`), API access (`api.service.ts` and a `*.api.ts` per backend area), the response types (`types.ts`), shared filters, dates, metric labels and units |
| `src/app/charts`   | ECharts setup, the theme read from the tokens, and pure option builders (`options.ts`)                                                                                      |
| `src/app/ui`       | The console's small kit: panel, stat tile, segmented control, chart directive, breakdown view, icons, short id, confirmations and toasts                                    |
| `src/app/features` | One folder per page, each lazily loaded                                                                                                                                     |
| `src/styles`       | `naucto-tokens.css`, copied from the Naucto Frontend                                                                                                                        |
| `nginx/`           | The production server and its `/api` proxy                                                                                                                                  |

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
- Every id the backend answers is a UUID in lower case, a `string` here. It names one thing and
  says nothing else: compare it for equality, never order by it, never compute on it. A screen
  shows one with `nc-short-id`: its first eight characters, the whole id copied on a click and read
  by assistive technology, and `plain` inside a link or a button, where a second control cannot
  nest. A name built in code takes the same short form from `shortId` (`core/ids.ts`). An id read
  from a URL or from `localStorage` goes through `idOf`, which gives nothing for anything else.
- No inline scripts and no third-party origins: the production CSP refuses both. That is also why
  critical CSS inlining is off in `angular.json`.
- `img-src` and `media-src` allow `blob:` besides `'self'`: a bug screenshot, the cover of a game
  and its clip need the bearer, so they are fetched and shown through object URLs.
- Component selectors, directives and global classes take the `nc` prefix (`nc-panel`,
  `ncChart`, `.nc-button`). Never name anything `ad-…`, `ads`, `banner` or `sponsor`: ad blockers
  (Opera's built-in one, uBlock, AdBlock) hide elements by such names through EasyList's generic
  rules (`##.ad-button`, `##.ad-panel`), and the console would lose its sign-in button and panels
  for everyone running one.
- Commits: `[ADMIN] [TYPE] Capitalized message`, TYPE among ADD/REMOVE/UPDATE/REFACTO/CLEAN/FIX,
  with the Jira key in the body (`Refs NCTO-276`). Branch = Jira key.

## Roles

Three staff roles sign in, and the backend decides again on every request what each may do. The
console only keeps from drawing what would be refused.

- `core/roles.ts` says which areas a role opens (`canOpen`) and whether it changes anything
  (`canAct`, `isAdmin`). `core/nav.ts` builds the sidebar and the landing page from it. Both are
  pure and tested in `roles.spec.ts`.
- An admin opens and does everything. A moderator opens moderation only. A viewer opens every area
  and changes nothing: it gets each screen without the controls that write, never a disabled
  button that explains nothing.
- A route names its area through the `page()` helper of `app.routes.ts`, and `areaGuard` sends a
  role that does not open it to where that role starts. A new page states its area there.
- A control that writes is wrapped in `@if (auth.isAdmin())`, or `auth.canAct()` once moderators
  share it. A read needs nothing.
- An admin hands out the three roles on the Staff page (`features/admins`, still at `/admins`).
  `STAFF_ROLES` and `roleGrant` in `core/roles.ts` say which roles there are and what each comes
  to, which is the sentence the confirmation shows. The backend writes every change to the
  moderation log.
- Only an admin is given email addresses, so `email` is nullable on every account the API hands
  over. Draw the address only when there is one.

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
- A game is always chosen through `nc-game-picker`, which searches the backend a few at a time, by
  part of a name or by a full id. Never put every game in a `<select>`: the list only grows.
- Posts falling on the same point of an axis draw one line (`charts/markers.ts`), labelled with how
  many share it. `MarkerVisibilityStore` holds the posts an admin hid, and every chart drawing
  posts reads them through it, so `nc-marker-filter` hides a post everywhere at once.
- Saved Compare charts, the chosen Timeline rows and the hidden posts live in `localStorage`, a
  convenience of one browser. What a browser holds in a shape the console no longer writes is left
  out when read and gone at the next save, never migrated. Posts themselves are server data
  (`admin/analytics/markers`).

## Support

The Support group of the sidebar reads what people send from Naucto itself.

- Feedback (`features/ratings`) charts the platform ratings and lists them with their comments. It
  is a stats page: the top bar's range and grain apply.
- Bug reports (`features/bugs`) lists the reports and opens each on its own route, `bugs/:id`. The
  `id` reaches the page as an input through `withComponentInputBinding`. `core/bug-count.store.ts`
  keeps the sidebar's count of new reports, read at boot, every minute and after a triage save.
- Crashes (`features/crashes`) lists crashes, one per error message, and resolves, ignores or
  reopens them. A crash is open while the team has not closed it, whatever its finer status.
- The backend keeps all three as one report under `/admin/reports`. `core/report-views.ts` turns a
  report into the rating, bug report or crash a page shows, so a page never reads the fields of
  another kind. `UserFeedbackApi` (`core/user-feedback.api.ts`, named apart from
  `ui/feedback.service.ts`, the console's own toasts and confirmations) reads ratings and bug
  reports, and `CrashesApi` reads crashes.
- A screenshot is read with `ApiService.getBlob`, since an `<img>` cannot send the bearer, and shown
  through an object URL that the page revokes when it leaves the report. That is the reason for
  `blob:` in the CSP's `img-src`.

## Moderation

The Moderation group reads what users reported on Naucto and what staff did about it, from the
backend's `admin/moderation` routes (`core/moderation.api.ts`).

- "Report" already names bug reports, crashes and ratings in the code, so a user's report of a
  game, a comment, a collection or a profile is a **flag** there, and every flag on one target
  makes a **case**. The screens still say "report", which is the word people know.
- A kind of target is one entry in each map of `core/moderation-format.ts`: `TARGET_TYPE_LABELS`,
  `TARGET_NOUNS`, the labels and tones of its actions, `panelRoute` and, for content,
  `CONTENT_ROOTS`. The type filters of the Queue and the Log are built from `TARGET_TYPE_LABELS`.
  A screen names a kind only for what that kind alone has (the game a comment sits on, the editor
  of a game, the games of a collection); everything else speaks of a target.
- The Queue (`features/moderation/queue.page`) lists cases, never single flags.
  `core/case-count.store.ts` keeps the sidebar's count of open cases, read like the bug count.
- `core/moderation-format.ts` holds the labels, the chip tones, what the dialog of each operation
  asks for (`operationForm`) and the body it sends (`decisionOf`). It is pure and tested, so a
  screen never decides by itself which fields a decision takes.
- A case (`features/moderation/case.page`, `moderation/cases/:targetType/:targetId`) shows the
  content as it is now, each report with what it kept when the content has changed since, what was
  done, and the owner with their record.
- A collection is read in its case and nowhere else: its title and description, who its owner lets
  read it (`visibility`) and the games it lists, each linked to its page here. The backend lists no
  collections, so the console has no directory of them and `panelRoute` gives a collection no page.
  Staff hide, restore and delete one under `admin/moderation/collections`.
- Users (`users.page`, `user-detail.page`) lists every account with its standing and opens one on
  its record, read from the log by `subjectUserId`. A directory searches through `nc-search-box`,
  which settles once the typing pauses.
- All games (`all-games.page`, `game-detail.page`) lists every game, published or not, and takes
  `?creator=` for the games of one account. A cover and a clip are read as bytes like a bug
  screenshot, since those of a hidden game are no longer served.
- A game has one staff address on the site, its `editUrl`: the normal editor, which opens read-only
  for staff and writes the look to the log. The case of a game and its page link to it, for the
  roles that act only, since the site refuses a viewer.
- Comments (`comments.page`) lists every comment and opens a row under the list, as Crashes does,
  with its decisions and what was done about it. It takes `?author=` and `?game=`. A comment has
  no page of its own, which is why `panelRoute` gives it none.
- Log (`log.page`) reads every action, newest first, filtered by action, by what it was about and,
  through `?actor=`, by staff member. The backend only ever appends to it, so the page has no
  control that writes.
- Every decision goes through `ModerationActions.run` (`features/moderation`): it finds the route
  with `operationRequest`, asks through `ActionDialogService`, sends, toasts and refreshes the
  count. A screen only reloads its own data when it resolves true. The yes or no of
  `FeedbackService.confirm` is for everything else.
- `nc-operation-buttons` draws one button per allowed operation, so a role never sees a button the
  backend would refuse.
- Which operations a screen offers comes from the `allowedActions` the backend sends with a
  target, never from the role alone.

## Before finishing

`npm run typecheck && npm test && npm run build`, and `npm run format:check`.
