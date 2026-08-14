FROM oven/bun:1-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ARG DATABASE_URL=postgres://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}
RUN bun run build

FROM oven/bun:1-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Drizzle Kit is retained so this container can apply checked-in migrations on startup.
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/src ./src

EXPOSE 3000

CMD ["sh", "-c", "bunx --no-install drizzle-kit migrate && bun ./build"]
