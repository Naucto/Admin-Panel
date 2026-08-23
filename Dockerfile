# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

# Vite inlines VITE_* at build time, so this has to be a build arg -- setting it
# on the running nginx container has no effect.
ARG VITE_BACKEND_URL
ARG VITE_FRONTEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
RUN npm run build

# ---- Runtime stage: nginx serves static SPA ----
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
