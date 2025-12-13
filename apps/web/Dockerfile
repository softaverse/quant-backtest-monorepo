FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

# 安裝依賴 + 建構階段
FROM base AS builder
WORKDIR /app

# 複製 monorepo 配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY shared/ ./shared/

# 安裝依賴
RUN pnpm install --frozen-lockfile

# 複製前端原始碼
COPY apps/web/ ./apps/web/

# 設定環境變數
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 建構
WORKDIR /app/apps/web
RUN pnpm run build

# 運行階段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Monorepo standalone 輸出在 .next/standalone/apps/web
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Monorepo 結構下 server.js 路徑
CMD ["node", "apps/web/server.js"]
