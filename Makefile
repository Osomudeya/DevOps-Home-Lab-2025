# 🎮 Humor Memory Game - Complete Deployment Makefile
# From Docker Compose to Production Kubernetes

.PHONY: help build push deploy clean logs status test health

# Default target
help:
	@echo "🎮 Humor Memory Game - Deployment Commands"
	@echo "=========================================="
	@echo ""
	@echo "🏗️  BUILD & PUSH:"
	@echo "  build          Build all Docker images"
	@echo "  push           Push images to local registry"
	@echo "  build-push     Build and push all images"
	@echo ""
	@echo "🚀 DEPLOYMENT:"
	@echo "  deploy         Deploy entire stack to Kubernetes"
	@echo "  deploy-dev     Deploy with development settings"
	@echo "  deploy-prod    Deploy with production settings"
	@echo ""
	@echo "📊 MONITORING:"
	@echo "  deploy-mon     Deploy monitoring stack (Prometheus + Grafana)"
	@echo "  deploy-argo    Deploy ArgoCD for GitOps"
	@echo "  deploy-cf      Deploy Cloudflare tunnel"
	@echo ""
	@echo "🔍 INSPECTION:"
	@echo "  status         Show deployment status"
	@echo "  logs           Show application logs"
	@echo "  test           Run health checks"
	@echo ""
	@echo "🧹 CLEANUP:"
	@echo "  clean          Remove all deployments"
	@echo "  clean-images   Remove local Docker images"
	@echo "  reset          Complete cluster reset"
	@echo ""
	@echo "📚 UTILITIES:"
	@echo "  setup-k3d      Create k3d cluster"
	@echo "  setup-registry Create local Docker registry"
	@echo "  port-forward   Setup port forwarding for services"

# Build all Docker images
build:
	@echo "🔨 Building Docker images..."
	docker build -t localhost:5001/humor-game-backend:latest ./backend
	docker build -t localhost:5001/humor-game-frontend:latest ./frontend
	@echo "✅ Images built successfully"

# Push images to local registry
push:
	@echo "📤 Pushing images to local registry..."
	docker push localhost:5001/humor-game-backend:latest
	docker push localhost:5001/humor-game-frontend:latest
	@echo "✅ Images pushed successfully"

# Build and push in one command
build-push: build push

# Deploy entire stack
deploy:
	@echo "🚀 Deploying to Kubernetes..."
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/postgres.yaml
	kubectl apply -f k8s/redis.yaml
	kubectl apply -f k8s/backend.yaml
	kubectl apply -f k8s/frontend.yaml
	kubectl apply -f k8s/ingress.yaml
	@echo "✅ Deployment complete"

# Deploy with development settings
deploy-dev:
	@echo "🔧 Deploying development stack..."
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/postgres.yaml
	kubectl apply -f k8s/redis.yaml
	kubectl apply -f k8s/backend.yaml
	kubectl apply -f k8s/frontend.yaml
	@echo "✅ Development deployment complete"

# Deploy with production settings
deploy-prod:
	@echo "🏭 Deploying production stack..."
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/postgres.yaml
	kubectl apply -f k8s/redis.yaml
	kubectl apply -f k8s/backend.yaml
	kubectl apply -f k8s/frontend.yaml
	kubectl apply -f k8s/ingress.yaml
	@echo "✅ Production deployment complete"

# Deploy monitoring stack
deploy-mon:
	@echo "📊 Deploying monitoring stack..."
	kubectl apply -f k8s/monitoring.yaml
	@echo "✅ Monitoring deployed"
	@echo "🌐 Access Prometheus: kubectl port-forward -n monitoring service/prometheus 9090:9090"
	@echo "📈 Access Grafana: kubectl port-forward -n monitoring service/grafana 3000:3000 (admin/admin123)"

# Deploy ArgoCD
deploy-argo:
	@echo "🔄 Deploying ArgoCD..."
	./scripts/setup-argocd.sh
	@echo "✅ ArgoCD deployed"

# Deploy Cloudflare tunnel
deploy-cf:
	@echo "☁️  Deploying Cloudflare tunnel..."
	kubectl apply -f k8s/cloudflare-tunnel.yaml
	@echo "✅ Cloudflare tunnel deployed"

# Show deployment status
status:
	@echo "📊 Deployment Status"
	@echo "==================="
	@echo ""
	@echo "🔍 Pods:"
	kubectl get pods -n humor-game
	@echo ""
	@echo "🌐 Services:"
	kubectl get services -n humor-game
	@echo ""
	@echo "📡 Ingress:"
	kubectl get ingress -n humor-game
	@echo ""
	@echo "💾 Persistent Volumes:"
	kubectl get pvc -n humor-game

# Show application logs
logs:
	@echo "📝 Application Logs"
	@echo "=================="
	@echo ""
	@echo "🔧 Backend logs:"
	kubectl logs -n humor-game -l app=backend --tail=20
	@echo ""
	@echo "🎨 Frontend logs:"
	kubectl logs -n humor-game -l app=frontend --tail=20

# Run health checks
test:
	@echo "🧪 Running health checks..."
	@echo ""
	@echo "🏥 Backend health:"
	curl -s http://localhost:3001/health || echo "❌ Backend not accessible"
	@echo ""
	@echo "🎮 Frontend health:"
	curl -s http://localhost:8080/ | head -5 || echo "❌ Frontend not accessible"
	@echo ""
	@echo "🗄️  Database connection:"
	kubectl exec -n humor-game deployment/postgres -- pg_isready -U gameuser || echo "❌ Database not accessible"

# Setup k3d cluster
setup-k3d:
	@echo "🏗️  Creating k3d cluster..."
	k3d cluster create humor-game-cluster \
		--servers 1 \
		--agents 2 \
		--port 8080:80@loadbalancer \
		--port 8443:443@loadbalancer \
		--k3s-arg '--disable=traefik@server:*' \
		--registry-use k3d-k3d-registry:5000
	@echo "✅ k3d cluster created"

# Setup local registry
setup-registry:
	@echo "📦 Creating local Docker registry..."
	docker run -d --restart=always -p 5001:5000 --name k3d-registry registry:2
	@echo "✅ Local registry created at localhost:5001"

# Setup port forwarding
port-forward:
	@echo "🔌 Setting up port forwarding..."
	@echo "🌐 Frontend: http://localhost:8080"
	@echo "🔧 Backend: http://localhost:3001"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3000"
	@echo ""
	@echo "Run these commands in separate terminals:"
	@echo "kubectl port-forward -n humor-game service/frontend 8080:80"
	@echo "kubectl port-forward -n humor-game service/backend 3001:3001"
	@echo "kubectl port-forward -n monitoring service/prometheus 9090:9090"
	@echo "kubectl port-forward -n monitoring service/grafana 3000:3000"

# Clean up deployments
clean:
	@echo "🧹 Cleaning up deployments..."
	kubectl delete -f k8s/ingress.yaml --ignore-not-found=true
	kubectl delete -f k8s/frontend.yaml --ignore-not-found=true
	kubectl delete -f k8s/backend.yaml --ignore-not-found=true
	kubectl delete -f k8s/redis.yaml --ignore-not-found=true
	kubectl delete -f k8s/postgres.yaml --ignore-not-found=true
	kubectl delete -f k8s/configmap.yaml --ignore-not-found=true
	kubectl delete -f k8s/namespace.yaml --ignore-not-found=true
	@echo "✅ Cleanup complete"

# Clean up Docker images
clean-images:
	@echo "🗑️  Cleaning up Docker images..."
	docker rmi localhost:5001/humor-game-backend:latest || true
	docker rmi localhost:5001/humor-game-frontend:latest || true
	@echo "✅ Images cleaned"

# Complete reset
reset: clean clean-images
	@echo "🔄 Resetting cluster..."
	k3d cluster delete humor-game-cluster || true
	docker stop k3d-registry || true
	docker rm k3d-registry || true
	@echo "✅ Complete reset done"

# Quick start (build, push, deploy)
quick-start: build-push deploy
	@echo "🚀 Quick start complete!"
	@echo "🌐 Access your app: http://localhost:8080"

# Production deployment
production: build-push deploy-prod deploy-mon deploy-argo deploy-cf
	@echo "🏭 Production deployment complete!"
	@echo "🌐 Access your app: https://gameapp.games"