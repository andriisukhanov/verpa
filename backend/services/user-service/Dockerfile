# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY ../../../package.json ../../../yarn.lock ../../../
COPY ../../packages/common/package.json ../../packages/common/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy common package
COPY ../../packages/common ../../packages/common
RUN cd ../../packages/common && yarn build

# Copy service source
COPY . .

# Build the service
RUN yarn build

# Production stage
FROM node:18-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --production --frozen-lockfile && \
    yarn cache clean

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/../../packages/common/dist ../packages/common/dist
COPY --from=builder /app/../../packages/common/package.json ../packages/common/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health/liveness', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]