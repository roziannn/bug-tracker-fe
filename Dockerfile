FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable

# Dependencies
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Development
FROM deps AS development

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--webpack", "--hostname", "0.0.0.0"]

# Production build
FROM deps AS builder

COPY . .

RUN pnpm build

# Production runtime
FROM base AS production

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["pnpm", "start", "--hostname", "0.0.0.0"]