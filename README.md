# Naucto Admin Panel

Separate Bun/Nest/AdminJS service for Naucto moderation and super-admin traffic
analytics. It connects to the same Postgres database as the backend and uses
the platform `User` credentials for staff login.

## Requirements

- Bun 1.2+
- A migrated Naucto backend database
- A user with the `Admin` or `Moderator` role

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `ADMIN_PORT`
- `ADMIN_ROOT_PATH`
- `ADMIN_COOKIE_SECRET`
- `ADMIN_SESSION_SECRET`
- `FRONTEND_URL`
- `RAW_ANALYTICS_RETENTION_DAYS`

## Local Development

```bash
bun install
bun run dev
```

The panel is available at `http://localhost:3002/admin` by default.

## Build

```bash
bun run build
bun run start
```

`bun run prisma:generate` copies `../Backend/prisma` into `.generated-prisma`
before generating the local Prisma client, so the backend remains the schema
owner.

## Docker

From `Admin-Panel`:

```bash
docker compose up --build
```

The compose file joins the existing external `naucto` Docker network.
