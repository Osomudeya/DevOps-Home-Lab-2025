#!/bin/bash

# ArgoCD Setup Script for Humor Memory Game
# This script installs and configures ArgoCD for your Kubernetes cluster

set -e

echo "🚀 Setting up ArgoCD for Humor Memory Game"
echo "============================================"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

echo "✅ Kubernetes cluster is accessible"

# Create ArgoCD namespace
echo "📦 Creating ArgoCD namespace..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# Install ArgoCD
echo "🔧 Installing ArgoCD..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
echo "⏳ Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Get ArgoCD admin password
echo "🔑 Getting ArgoCD admin password..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo ""
echo "🎉 ArgoCD is ready!"
echo "==================="
echo "🌐 Access ArgoCD UI:"
echo "   kubectl port-forward service/argocd-server 8081:443 -n argocd"
echo "   Then visit: https://localhost:8081"
echo ""
echo "👤 Login credentials:"
echo "   Username: admin"
echo "   Password: $ARGOCD_PASSWORD"
echo ""
echo "📋 Next steps:"
echo "   1. Port-forward ArgoCD UI (command above)"
echo "   2. Login with admin/$ARGOCD_PASSWORD"
echo "   3. Create your project: kubectl apply -f k8s/argocd-project.yaml"
echo "   4. Deploy your app: kubectl apply -f k8s/argocd-app.yaml"
echo ""
echo "✅ ArgoCD setup complete!"
