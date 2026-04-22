# Multi-stage build for Chesapeake City Agentic AI Chatbot
# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (devDependencies needed for build)
# Postinstall scripts needed for native binaries (lightningcss, etc.)
RUN npm ci

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Build the application
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    bash \
    curl \
    sqlite \
    sqlite-libs \
    dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components
COPY --from=builder /app/app ./app
COPY --from=builder /app/scripts ./scripts

# Create data directory and set permissions
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Copy entrypoint script
COPY --from=builder /app/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/chat', {method: 'GET'}).then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run the entrypoint script which handles setup (ingestion) then starts the app
CMD ["/app/docker-entrypoint.sh"]
