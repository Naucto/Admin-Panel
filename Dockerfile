# syntax=docker/dockerfile:1.7
# Builds the admin console and serves it with nginx, which also forwards /api to the Naucto
# backend named by NAUCTO_API_URL. The browser only ever talks to this one origin.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production \
  && find dist/naucto-admin/browser -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.ttf' \) -exec gzip -9 -k {} \;

FROM nginx:1.27-alpine AS runtime
ENV NAUCTO_API_URL=http://backend:3000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build --chown=nginx:nginx /app/dist/naucto-admin/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
