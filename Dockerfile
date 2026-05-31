# ---- Build stage ----
FROM oven/bun:1.2.23-alpine AS builder

WORKDIR /app

COPY Admin-Panel/package.json Admin-Panel/bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY Admin-Panel ./
RUN bun run build

# ---- Runtime stage: nginx serves static SPA ----
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY Admin-Panel/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
