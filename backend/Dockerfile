# syntax=docker/dockerfile:1

#################################
# 1) deps: install prod deps only, cached separately from source changes
#################################
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Uses npm ci when a package-lock.json is present (reproducible builds),
# falling back to npm install on the first run before a lockfile exists.
# Once you run `npm install` locally and commit the generated
# package-lock.json, this will automatically switch to the faster,
# reproducible `npm ci` path.
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi

#################################
# 2) runtime: minimal final image
#################################
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# dumb-init handles signal forwarding (SIGTERM) correctly as PID 1, so our
# graceful-shutdown code in server.js actually gets invoked on `docker stop`.
RUN apk add --no-cache dumb-init

# Non-root user for defense in depth.
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodeusr:nodegrp . .

USER nodeusr

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/healthz', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
