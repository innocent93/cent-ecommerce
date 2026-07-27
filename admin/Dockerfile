# syntax=docker/dockerfile:1

#################################
# 1) build: install deps & produce static assets
#################################
FROM node:20-alpine AS build
WORKDIR /app

# Build-time API URL baked into the static bundle (Vite env vars are
# resolved at build time, not runtime). Override with:
#   docker build --build-arg VITE_BACKEND_URL=https://api.example.com .
ARG VITE_BACKEND_URL=http://localhost:5000
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .
RUN npm run build

#################################
# 2) runtime: nginx serving the static build
#################################
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN addgroup -S webgrp && adduser -S webusr -G webgrp \
  && chown -R webusr:webgrp /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
  && touch /var/run/nginx.pid && chown webusr:webgrp /var/run/nginx.pid

USER webusr
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
