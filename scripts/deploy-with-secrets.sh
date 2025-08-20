#!/bin/bash

# Deploy with Secrets Script
# This script helps you deploy your application with proper secret management
# instead of hardcoded values in the repository

set -e

echo "🔐 Deploying with Proper Secret Management"
echo "=========================================="

# Check if .env file exists
if [ ! -f "k8s/.env" ]; then
    echo "❌ No .env file found in k8s/ directory"
    echo ""
    echo "📝 Please create your .env file:"
    echo "   1. Copy the template: cp k8s/env.template k8s/.env"
    echo "   2. Edit k8s/.env with your actual values"
    echo "   3. Run this script again"
    echo ""
    echo "⚠️  IMPORTANT: Never commit your .env file to version control!"
    exit 1
fi

echo "✅ .env file found"

# Source the environment variables
source k8s/.env

# Validate required variables
required_vars=("DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Please set $var in your k8s/.env file"
        exit 1
    fi
done

echo "✅ All required secrets are configured"

# Create the secret with actual values
echo "🔐 Creating Kubernetes Secret with your values..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: humor-game-secrets
  namespace: humor-game
type: Opaque
stringData:
  DB_PASSWORD: "$DB_PASSWORD"
  REDIS_PASSWORD: "$REDIS_PASSWORD"
  JWT_SECRET: "$JWT_SECRET"
EOF

# Apply the rest of the configuration
echo "🚀 Applying Kubernetes manifests..."
kubectl apply -f k8s/

echo ""
echo "✅ Deployment complete!"
echo "🔐 Your secrets are now properly stored in Kubernetes Secrets"
echo "📊 Check status with: kubectl get pods -n humor-game"
echo ""
echo "⚠️  Remember:"
echo "   - Keep your .env file secure and never commit it"
echo "   - In production, use external secret managers"
echo "   - Rotate your secrets regularly"
