# Frontend Dockerfile - Simple Nginx setup
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including vite for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Install netcat for connection testing
RUN apk add --no-cache netcat-openbsd

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Fix nginx permissions (run as root for nginx)
RUN chmod -R 755 /usr/share/nginx/html

# Create nginx directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/log/nginx && \
    chmod -R 755 /var/cache/nginx && \
    chmod -R 755 /var/log/nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]