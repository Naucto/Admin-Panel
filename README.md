# Naucto Admin Panel

React + Vite SPA for Naucto staff moderation and analytics.

**It is a browser client, not a server.** The only process this repo runs in
production is nginx serving a static bundle -- there is no admin backend, no
BFF, and no proxy. Every `/admin/*` call is made from the staff member's browser
straight to the main Backend, authenticated with HTTP-only cookies.

**Staff sign in as themselves.** There are no service accounts: a moderator logs
in with their ordinary Naucto account, which must carry the `Admin` or
`Moderator` role. That is deliberate -- every mutation writes a
`ModerationAction` audit row naming the person who took it, which a shared
service identity could not do.

The panel holds no credentials of its own: no database URL, no JWT secret, no
session secret. The Backend owns all of that and is the only security boundary.

## Requirements

- Bun 1.2+ (or Node 22+ if you prefer `npm`)
- A reachable Naucto Backend with the `/admin/*` endpoints
- A user account in the Backend with the `Admin` or `Moderator` role

## Environment

Copy `.env.example` to `.env` and set:

- `VITE_BACKEND_URL` — Backend base URL (e.g. `http://localhost:3000` in dev,
  `https://api.naucto.com` in production)

That's it. No database URL, no JWT secret, no session secret — the Backend owns
all of that.

## Local Development

```bash
bun install
bun run dev
```

Available at `http://localhost:3002`. The dev server proxies cookies through to
the Backend at `VITE_BACKEND_URL`, so make sure CORS in the Backend includes
this origin (configurable via `ADMIN_PANEL_URL` env var on the Backend).

## Type-check and build

```bash
bun run typecheck     # tsc --noEmit
bun run build         # tsc -b && vite build
bun run preview       # serve dist/ for smoke-testing
```

## Regenerating the API SDK (optional)

The Admin-Panel currently uses a hand-written, typed axios client in
[src/api/](src/api/). If you'd prefer to switch to a generated SDK
(`@hey-api/openapi-ts`), an `openapi-ts.config.ts` is already configured:

```bash
# In Backend/, first regenerate swagger.json:
cd ../Backend && npm run generate:swagger
# Then in Admin-Panel/:
cd ../Admin-Panel && bun run api:generate
```

The generated client lands in `src/api/` and can be wired up alongside (or in
place of) the hand-written one.

## Architecture

```
Browser (admin.naucto.com)
  |
  |-- static bundle ------> nginx (this repo; serves dist/, nothing else)
  |
  '-- XHR + cookies ------> Backend /admin/* --> Prisma --> Postgres
```

- **Auth**: `POST /admin/auth/login` validates an ordinary user account, checks
  it holds `Admin` or `Moderator`, and sets three cookies on the Backend's
  origin: `naucto_admin_access` (HttpOnly), `naucto_admin_refresh` (HttpOnly,
  scoped to `/admin/auth`), and `naucto_admin_csrf` (readable, double-submit).
- **Token scope**: admin cookies and regular API bearer tokens are signed with
  the same secret, so each token carries a `scope` claim (`"admin"` or
  `"user"`). The Backend's two passport strategies check it, which is what stops
  an API token from being pasted into the admin cookie -- or the reverse.
- **CSRF**: The axios client reads `naucto_admin_csrf` and echoes it back in
  the `X-CSRF-Token` header on every non-GET request. The Backend rejects writes
  with a missing or mismatched token, and rejects any write from an origin other
  than `ADMIN_PANEL_URL`. `login` and `refresh` are exempt from the
  double-submit check (they run before a CSRF cookie exists) but not from the
  origin check.
- **401 handling**: On 401, the axios interceptor calls `/admin/auth/refresh`
  once (single-flight) and retries the original request. Persistent 401 sends
  the user back to `/login`. Refresh also re-checks staff roles, so a demoted
  moderator loses the panel at the next rotation rather than at token expiry.
- **All mutations** go through Backend services that write an audit row in
  `ModerationAction` — every staff action is traceable to a named person.

### Why not a separate admin server?

A server-to-server design (an admin backend with its own moderation accounts,
talking to the main Backend) would buy network isolation, but it would cost the
audit trail its most useful property: the name of the human who acted. Naucto's
moderators are community members, not systems, so the panel authenticates them
as themselves and the Backend authorises each call by role.

The trade-off is that `/admin/*` is reached directly from a browser, which is
why the CSRF double-submit and the origin check exist. For extra isolation, put
the panel behind a VPN or an authenticating reverse proxy (see below) rather
than introducing a second backend.

## Production deployment

The Dockerfile produces a static bundle served by nginx. Recommended setup:

- Serve at `admin.naucto.com`
- Backend at `api.naucto.com` with `ADMIN_PANEL_URL=https://admin.naucto.com`
- In production, set `ADMIN_COOKIE_DOMAIN=.naucto.com` on the Backend so
  cookies are shared across the subdomain pair
- Restrict access via VPN, network ACL, or an authenticating reverse proxy
  if extra defense-in-depth is required

Start the Backend stack first — it creates the shared `naucto` network this
compose file joins as external.

```bash
docker compose up --build
```

`VITE_BACKEND_URL` is a **build** arg (Vite inlines `VITE_*` into the bundle), so
point it at the deployed API before building; setting it on the running nginx
container has no effect.
