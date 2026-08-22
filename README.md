# Naucto Admin Panel

React + Vite SPA for Naucto staff moderation and analytics. **Server-to-server**
architecture: the panel is a thin frontend that calls the Backend's
`/admin/*` HTTP API using HTTP-only cookies. It does **not** access the database
directly and has no database credentials.

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

- **Auth**: Login via `POST /admin/auth/login` sets three cookies on the
  Backend's origin: `naucto_admin_access` (HttpOnly), `naucto_admin_refresh`
  (HttpOnly), and `naucto_admin_csrf` (readable, double-submit for write
  protection).
- **CSRF**: The axios client reads `naucto_admin_csrf` and echoes it back in
  the `X-CSRF-Token` header on every non-GET request. Backend rejects writes
  with a missing or mismatched token.
- **401 handling**: On 401, the axios interceptor calls `/admin/auth/refresh`
  once (single-flight) and retries the original request. Persistent 401 sends
  the user back to `/login`.
- **All mutations** go through Backend services that write an audit row in
  `ModerationAction` — every staff action is traceable.

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
