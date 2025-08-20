# Backend Dockerfile - Node.js API only
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache postgresql-client redis

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Copy application code
COPY --chown=backend:nodejs . .

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R backend:nodejs /app

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Health check temporarily disabled for testing
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#     CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]