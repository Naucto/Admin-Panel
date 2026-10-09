# Naucto Admin

The console Naucto's admins sign in to: platform statistics from the usage analytics (NCTO-276),
and who holds the admin role. Angular 22, Tailwind 4 over Naucto's own design tokens, and
[Apache ECharts](https://echarts.apache.org) for the charts.

## What it does

| Page     | What it shows                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overview | Headline figures for today, this week or this month against the period before; traffic; play; who is online now; the funnel from first visit to a published game; how far the numbers are settled            |
| Audience | New and returning visitors, sessions and bounce rate, visit length, where sessions come from (country, device, browser, system, screen, language, referrer, campaign), retention cohorts, most visited pages |
| Games    | Plays, players and play time; top games, sortable and paged, each with its own trend; multiplayer rooms and time played together                                                                             |
| Creators | Sign-ups, active accounts, time spent building, projects and releases                                                                                                                                        |
| Live     | Who is online this minute and doing what, the last hour, games being played, presence over 24 hours or 7 days                                                                                                |
| Explorer | Any metric of the registry, with its definition, at any grain, against the period before, split by its dimensions, period by period                                                                          |
| Admins   | The admins, adding one from the existing Naucto accounts, removing one                                                                                                                                       |
| Account  | Appearance, sign out                                                                                                                                                                                         |

Every view says what it holds when there is little or nothing yet: three periods or fewer draw as
labelled bars of those periods only, a figure with nothing before it says so, and an empty panel
explains when its data will appear rather than drawing a flat line.

## Signing in

Only a Naucto account holding the `Admin` role gets in, with its email and password. The access
token lives in memory. An httpOnly, `SameSite=Strict` cookie renews it for eight hours, so a
reload keeps the session and closing it for good means signing in again.

## Run it

It needs the Naucto backend (`NCTO-276-website-kpi` or later) and an admin account.

```sh
npm install
npm start             # http://localhost:3002, /api forwarded to http://localhost:3000
NAUCTO_API=http://host.docker.internal:3000 npm start   # the backend somewhere else
```

To give an account the admin role the first time, set its `role` column to `Admin` in the
database; after that, admins add each other from the Admins page. For charts with something in
them on a local backend, the backend's `npm run seed:analytics` writes 60 days of synthetic data.

| Command             | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `npm start`         | Dev server on port 3002, with the `/api` proxy of `proxy.conf.mjs` |
| `npm run build`     | Production build into `dist/naucto-admin`                          |
| `npm test`          | Unit tests (Vitest)                                                |
| `npm run typecheck` | `tsc` over the app and the tests                                   |
| `npm run format`    | Prettier                                                           |

## Deploy it

```sh
docker build -t naucto-admin .
docker run -p 8080:80 -e NAUCTO_API_URL=https://api.naucto.example naucto-admin
```

nginx serves the build and forwards `/api/` to `NAUCTO_API_URL`, so the browser only ever talks to
the console's own origin: the session cookie stays first-party and no CORS setting is involved.
The Content-Security-Policy allows nothing from elsewhere.
