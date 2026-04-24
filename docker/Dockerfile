
# Stage 1: Base — shared between dev and prod
FROM node:18-alpine AS base

WORKDIR /app

# Should be cached
COPY package*.json ./ 


# Stage 2: Development

FROM base AS development

# Install ALL dependencies (including devDependencies)
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]


# Stage 3: Production dependencies only

FROM base AS production-deps

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Stage 4: Production

FROM node:18-alpine AS production

# Security: don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=production-deps /app/node_modules ./node_modules

COPY . .

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]