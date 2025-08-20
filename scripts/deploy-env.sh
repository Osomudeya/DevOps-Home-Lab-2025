#!/bin/bash

# ========================================
# Environment Configuration Switcher
# ========================================
# This script helps switch between Docker and Kubernetes configurations
# without manually editing files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [docker|k8s|status]"
    echo ""
    echo "Commands:"
    echo "  docker    - Switch to Docker Compose configuration"
    echo "  k8s       - Switch to Kubernetes configuration"
    echo "  status    - Show current configuration status"
    echo ""
    echo "Examples:"
    echo "  $0 docker    # Switch to Docker config (uses nginx proxy)"
    echo "  $0 k8s       # Switch to K8s config (direct backend)"
    echo "  $0 status    # Show current config"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning "No .env file found. Creating from template..."
        cp env.template .env
        print_success "Created .env from template"
    fi
}

# Function to switch to Docker configuration
switch_to_docker() {
    print_status "Switching to Docker Compose configuration..."
    
    check_env_file
    
    # Update .env file for Docker
    sed -i.bak 's/^API_BASE_URL=.*/API_BASE_URL=\/api/' .env
    sed -i.bak 's/^REACT_APP_API_BASE_URL=.*/REACT_APP_API_BASE_URL=\/api/' .env
    
    # Remove backup file
    rm -f .env.bak
    
    print_success "Switched to Docker configuration (uses nginx proxy)"
    print_status "API requests will be proxied through nginx at /api/*"
    print_status "Run 'docker-compose up -d' to start your app"
}

# Function to switch to Kubernetes configuration
switch_to_k8s() {
    print_status "Switching to Kubernetes configuration..."
    
    check_env_file
    
    # Update .env file for Kubernetes
    sed -i.bak 's/^API_BASE_URL=.*/API_BASE_URL=http:\/\/backend:3001\/api/' .env
    sed -i.bak 's/^REACT_APP_API_BASE_URL=.*/REACT_APP_API_BASE_URL=http:\/\/backend:3001\/api/' .env
    
    # Remove backup file
    rm -f .env.bak
    
    print_success "Switched to Kubernetes configuration (direct backend)"
    print_status "API requests will go directly to backend service"
    print_status "Run 'kubectl apply -f k8s/' to deploy to Kubernetes"
}

# Function to show current configuration status
show_status() {
    print_status "Current configuration status:"
    echo ""
    
    if [ -f ".env" ]; then
        echo "📁 .env file: ${GREEN}EXISTS${NC}"
        echo ""
        echo "🔧 Current API configuration:"
        grep "^API_BASE_URL=" .env || echo "API_BASE_URL not set"
        grep "^REACT_APP_API_BASE_URL=" .env || echo "REACT_APP_API_BASE_URL not set"
        echo ""
        
        # Determine current mode
        if grep -q "^API_BASE_URL=/api" .env; then
            echo "🎯 Mode: ${GREEN}Docker Compose${NC} (nginx proxy)"
        elif grep -q "^API_BASE_URL=http://backend:3001" .env; then
            echo "🎯 Mode: ${BLUE}Kubernetes${NC} (direct backend)"
        else
            echo "🎯 Mode: ${YELLOW}Unknown${NC}"
        fi
    else
        echo "📁 .env file: ${RED}MISSING${NC}"
        echo "Run '$0 docker' or '$0 k8s' to create configuration"
    fi
    
    echo ""
    echo "📋 Available configurations:"
    echo "  • Docker: API_BASE_URL=/api (uses nginx proxy)"
    echo "  • K8s:    API_BASE_URL=http://backend:3001/api (direct backend)"
}

# Main script logic
case "${1:-}" in
    "docker")
        switch_to_docker
        ;;
    "k8s")
        switch_to_k8s
        ;;
    "status")
        show_status
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

echo ""
print_status "Configuration switch complete!"
