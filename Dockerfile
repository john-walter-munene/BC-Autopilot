# Multi-stage production container build
# Mirrors Overlay (CognitronTechnologies / john-walter-munene) container architecture

# Stage 1: Base dependencies
FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Install dependencies
FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Build application
FROM dependencies AS builder
WORKDIR /app
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 4: Playwright & Production Runner
FROM node:22-slim AS runner
WORKDIR /app

# Install system dependencies for Playwright headless browser execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    openssl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.ts"]
