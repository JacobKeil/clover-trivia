FROM oven/bun:1-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ARG DATABASE_URL=postgres://build:build@localhost:5432/build
ARG BETTER_AUTH_SECRET=build-only-secret-not-used-at-runtime-32-chars
ARG ORIGIN=http://localhost
ENV DATABASE_URL=${DATABASE_URL}
# Server-only modules are evaluated while SvelteKit builds the app. These values only
# exist in the build stage; the production container receives its real values from
# .env.production through Docker Compose.
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV ORIGIN=${ORIGIN}
RUN bun run build

FROM oven/bun:1-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
# SvelteKit's adapter-node default is 512K, which is too small for image uploads.
# The reverse proxy is configured with the same 20 MB limit.
ENV BODY_SIZE_LIMIT=20M

# Drizzle Kit is retained so this container can apply checked-in migrations on startup.
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/src ./src

EXPOSE 3000

CMD ["sh", "-c", "bunx --no-install drizzle-kit migrate && bun ./build"]
