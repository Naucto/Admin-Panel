FROM oven/bun:1.2.23-alpine AS base

WORKDIR /app

COPY Admin-Panel/package.json ./
RUN bun install

COPY Backend/prisma ./.generated-prisma
COPY Admin-Panel ./

RUN bun x prisma generate --schema .generated-prisma
RUN bun run build

ENV NODE_ENV=production
ENV ADMIN_PORT=3002
ENV ADMIN_ROOT_PATH=/admin

EXPOSE 3002

CMD ["bun", "dist/main.js"]
