FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

LABEL org.opencontainers.image.source="https://github.com/MrRagga-/signal-rest-ui"
LABEL org.opencontainers.image.description="Focused web UI for signal-cli-rest-api with direct and proxy transport modes."
LABEL org.opencontainers.image.licenses="Apache-2.0"

COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist-server/index.js"]
