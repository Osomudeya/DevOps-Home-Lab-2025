#!/bin/bash
# Environment Configuration Validation Script
# Ensures consistency between Docker Compose and Kubernetes deployments

set -e

echo "🔍 Validating Environment Configuration..."

# Check Docker Compose environment
echo "📦 Docker Compose Environment:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    grep -E "API_BASE_URL|NODE_ENV" .env || echo "⚠️  Missing API_BASE_URL or NODE_ENV in .env"
else
    echo "⚠️  .env file missing, using defaults"
fi

# Check docker-compose.override.yml
echo "🐳 Docker Compose Override:"
if grep -q "API_BASE_URL" docker-compose.override.yml; then
    echo "✅ API_BASE_URL configured in override"
else
    echo "❌ API_BASE_URL missing in override"
fi

# Check Kubernetes ConfigMap
echo "☸️  Kubernetes ConfigMap:"
if [ -f "k8s/frontend-config.yaml" ]; then
    echo "✅ Frontend ConfigMap exists"
    grep -E "API_BASE_URL|NODE_ENV" k8s/frontend-config.yaml || echo "⚠️  Missing keys in ConfigMap"
else
    echo "❌ Frontend ConfigMap missing"
fi

# Check frontend deployment
echo "🚀 Kubernetes Frontend Deployment:"
if grep -q "configMapKeyRef" k8s/frontend.yaml; then
    echo "✅ ConfigMap referenced in deployment"
else
    echo "❌ ConfigMap not referenced in deployment"
fi

# Check for hardcoded URLs
echo "🔒 Security Check - Hardcoded URLs:"
if grep -r "localhost:3001" frontend/ 2>/dev/null; then
    echo "❌ Found hardcoded localhost:3001 references"
else
    echo "✅ No hardcoded backend URLs found"
fi

echo "✅ Environment validation complete!"
