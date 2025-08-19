#!/bin/bash

# Kubernetes Deployment Script for Humor Memory Game
# This script reads from .env file and deploys to Kubernetes

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}🎮 HUMOR MEMORY GAME - K8S DEPLOYMENT 😂${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found! Please create one first."
    echo "Example .env content:"
    echo "DB_PASSWORD=your_secure_password"
    echo "REDIS_PASSWORD=your_secure_password"
    echo "JWT_SECRET=$(openssl rand -base64 64)"
    exit 1
fi

# Load environment variables
print_status "Loading environment variables from .env file..."
set -a
source .env
set +a

# Check required variables
required_vars=("DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        print_error "Required environment variable $var is not set in .env file"
        exit 1
    fi
done

print_success "Environment variables loaded successfully"

# Function to substitute variables in Kubernetes manifests
substitute_vars() {
    local file="$1"
    local temp_file="${file}.tmp"
    
    # Create a copy with substituted variables
    envsubst < "$file" > "$temp_file"
    
    # Apply the substituted manifest
    kubectl apply -f "$temp_file"
    
    # Clean up temp file
    rm "$temp_file"
}

# Deploy namespace first
print_status "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Deploy configmap and secrets with variable substitution
print_status "Deploying configuration and secrets..."
substitute_vars k8s/configmap.yaml

# Deploy database and cache
print_status "Deploying PostgreSQL..."
kubectl apply -f k8s/postgres.yaml

print_status "Deploying Redis..."
kubectl apply -f k8s/redis.yaml

# Wait for database services to be ready
print_status "Waiting for database services to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n humor-game --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n humor-game --timeout=60s

# Deploy application services
print_status "Deploying backend API..."
kubectl apply -f k8s/backend.yaml

print_status "Deploying frontend..."
kubectl apply -f k8s/frontend.yaml

# Wait for application services to be ready
print_status "Waiting for application services to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n humor-game --timeout=120s
kubectl wait --for=condition=ready pod -l app=frontend -n humor-game --timeout=60s

# Deploy ingress
print_status "Deploying ingress..."
kubectl apply -f k8s/ingress.yaml

# Wait for ingress to be ready
print_status "Waiting for ingress to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=ingress-nginx -n ingress-nginx --timeout=120s

print_success "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
kubectl get pods,svc,ingress -n humor-game

echo ""
echo "🌐 Access URLs:"
echo "  Game: https://gameapp.games"
echo "  API Health: https://gameapp.games/api/health"

echo ""
echo "📝 Useful commands:"
echo "  View logs: kubectl logs -l app=backend -n humor-game -f"
echo "  Check status: kubectl get pods -n humor-game"
echo "  Restart services: kubectl rollout restart deployment/backend -n humor-game"
echo "  Delete deployment: kubectl delete namespace humor-game"
