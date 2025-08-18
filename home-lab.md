# From Docker Compose to Production: Kubernetes + DevOps Home Lab (2025 Edition)

*Transform your Humor Memory Game from Docker Compose to production-ready Kubernetes in 10 focused steps.*

---

## Table of Contents

1. [Why This Lab - Your Game Goes Enterprise](#1-why-this-lab---your-game-goes-enterprise)
2. [Prerequisites - Copy-Paste Installation](#2-prerequisites---copy-paste-installation)
3. [Cluster in 60 Seconds](#3-cluster-in-60-seconds)
4. [Ingress + TLS for Your Game](#4-ingress--tls-for-your-game)
5. [Deploy Your Humor Memory Game](#5-deploy-your-humor-memory-game)
6. [Automation I - Supercharge Your Makefile](#6-automation-i---supercharge-your-makefile)
7. [Observability - Monitor Your Game](#7-observability---monitor-your-game)
8. [GitOps with ArgoCD](#8-gitops-with-argocd)
9. [Automation II - Full CI/CD Pipeline](#9-automation-ii---full-cicd-pipeline)
10. [Secure Public Access](#10-secure-public-access)

**Appendices:**
- [Troubleshooting Your Game](#appendix-a-troubleshooting-your-game)
- [Advanced Configurations](#appendix-b-advanced-configurations)

---

## 1. Why This Lab - Your Game Goes Enterprise

You have a working Humor Memory Game running in Docker Compose. That's great for development, but what if you want to:

- **Scale your backend** when traffic spikes during lunch breaks
- **Zero-downtime deployments** when you fix that emoji bug
- **Automatic rollbacks** when your latest feature breaks everything
- **Professional monitoring** to see who's actually playing
- **Secure public access** without exposing your router

This lab transforms your existing `docker-compose.yml` setup into a production-grade Kubernetes deployment with GitOps, monitoring, and CI/CD - all running on your laptop.

### What You'll Build

Starting with your current setup:
```
Docker Compose
├── backend (Node.js API)
├── frontend (Vanilla JS + Nginx)
├── postgres (Database)
├── redis (Cache)
└── nginx (Reverse Proxy)
```

You'll end up with:
```
Kubernetes Cluster
├── Ingress (nginx-ingress with TLS)
├── Backend (Auto-scaling pods)
├── Frontend (Served via Nginx)
├── PostgreSQL (Persistent storage)
├── Redis (Session cache)
├── Monitoring (Prometheus + Grafana)
├── GitOps (ArgoCD auto-deploy)
└── CI/CD (GitHub Actions)
```

### Tools We'll Use

Every tool serves a specific purpose in your game's journey:

- **k3d**: Lightweight Kubernetes (replaces Docker Compose)
- **kubectl**: Your new `docker-compose` command
- **Helm**: Package manager (like npm for Kubernetes)
- **mkcert**: Trusted HTTPS certificates
- **ArgoCD**: Automatic deployments from Git
- **Prometheus + Grafana**: See who's playing your game
- **Cloudflare Tunnel**: Secure public access

**Key Advantage**: Everything runs locally. No AWS bills, no Azure complexities - just your laptop and production-ready skills.

---

## 2. Prerequisites - Copy-Paste Installation

Since you already have Docker working, we just need to add the Kubernetes tools.

### macOS Installation

```bash
# Install Homebrew tools
brew install k3d kubectl helm mkcert cloudflared git

# Verify your Docker is working
docker --version && docker ps
```

### Windows (WSL2) Installation

```bash
# Install k3d
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install mkcert
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Linux (Ubuntu/Debian)

Same commands as Windows WSL2 above.

### Verification Checkpoint

```bash
docker --version          # Docker version 24.0.0+
k3d version               # k3d version v5.6.0+
kubectl version --client  # Client Version: v1.28.0+
helm version              # version.BuildInfo{Version:"v3.13.0+"}
mkcert -version           # v1.4.4+
cloudflared --version     # cloudflared version 2023.8.0+
```

**✅ Checkpoint**: All commands return version numbers. If any fail, install that tool individually.

---

## 3. Cluster in 60 Seconds

Time to replace Docker Compose with a real Kubernetes cluster. We'll keep your local registry running so image builds stay fast.

### Start Local Registry

Your game's images need somewhere to live. Keep it simple:

```bash
# This replaces your docker-compose image builds
docker run -d --restart=always -p 5001:5000 --name k3d-registry registry:2
```

### Create Your Game's Cluster

```bash
# Create cluster configuration
cat << EOF > k3d-config.yaml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: humor-game-cluster
servers: 1
agents: 2
ports:
  - port: 80:80
    nodeFilters:
      - loadbalancer
  - port: 443:443
    nodeFilters:
      - loadbalancer
registries:
  use:
    - k3d-registry:5000
options:
  k3s:
    extraArgs:
      - arg: --disable=traefik
        nodeFilters:
          - server:*
EOF

# Create the cluster (like docker-compose up, but better)
k3d cluster create --config k3d-config.yaml

# Switch to the new cluster
kubectl config use-context k3d-humor-game-cluster
```

### Verify Your Cluster

```bash
kubectl get nodes
kubectl get pods -A
kubectl cluster-info
```

**Expected Output**:
```
NAME                               STATUS   ROLES                  AGE   VERSION
k3d-humor-game-cluster-server-0    Ready    control-plane,master   30s   v1.28.2+k3s1
k3d-humor-game-cluster-agent-0     Ready    <none>                 25s   v1.28.2+k3s1
k3d-humor-game-cluster-agent-1     Ready    <none>                 25s   v1.28.2+k3s1
```

**✅ Checkpoint**: You now have a 3-node Kubernetes cluster running locally, ready for your game.

---

## 4. Ingress + TLS for Your Game

Your Docker Compose setup uses nginx on port 80. In Kubernetes, we need an Ingress controller to route traffic to your game's pods.

### Install nginx-ingress

```bash
# Add the official nginx-ingress chart
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install ingress controller (like your nginx service, but smarter)
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.hostNetwork=true \
  --set controller.hostPort.enabled=true \
  --set controller.hostPort.ports.http=80 \
  --set controller.hostPort.ports.https=443
```

### Generate TLS Certificates

Your game deserves HTTPS. mkcert creates certificates your browser trusts:

```bash
# Install the local CA
mkcert -install

# Generate certificates for your game
mkcert "humor-game.local.test" "*.127.0.0.1.sslip.io" localhost 127.0.0.1

# Create Kubernetes TLS secret
kubectl create secret tls humor-game-tls \
  --cert=humor-game.local.test+3.pem \
  --key=humor-game.local.test+3-key.pem
```

### Test Ingress

Quick test to ensure everything works:

```bash
# Create a test pod
kubectl run test-nginx --image=nginx --port=80
kubectl expose pod test-nginx --port=80

# Create test ingress
cat << EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
spec:
  tls:
  - hosts:
    - humor-game.local.test
    secretName: humor-game-tls
  rules:
  - host: humor-game.local.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: test-nginx
            port:
              number: 80
EOF

# Add to hosts file
echo "127.0.0.1 humor-game.local.test" | sudo tee -a /etc/hosts
```

**✅ Checkpoint**: Open `https://humor-game.local.test` - you should see nginx welcome page with a valid TLS certificate.

Clean up the test:
```bash
kubectl delete ingress test-ingress
kubectl delete service test-nginx
kubectl delete pod test-nginx
```

---

## 5. Deploy Your Humor Memory Game

Now we'll translate your `docker-compose.yml` into Kubernetes manifests. Each service becomes a Deployment + Service.

### Build and Push Your Images

First, get your app images into the local registry:

```bash
# Build your backend image
cd backend
docker build -t localhost:5001/humor-game/backend:v1.0.0 .
docker push localhost:5001/humor-game/backend:v1.0.0

# Build your frontend image  
cd ../frontend
docker build -t localhost:5001/humor-game/frontend:v1.0.0 .
docker push localhost:5001/humor-game/frontend:v1.0.0

cd ..
```

### Create Kubernetes Manifests

Create a `k8s/` directory to hold all your Kubernetes configs:

```bash
mkdir -p k8s
```

**k8s/namespace.yaml** - Organize your game:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: humor-game
  labels:
    app: humor-memory-game
```

**k8s/configmap.yaml** - Game configuration:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: humor-game-config
  namespace: humor-game
data:
  NODE_ENV: "production"
  DB_NAME: "humor_memory_game"
  DB_USER: "gameuser"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
  API_PORT: "3001"
  CORS_ORIGIN: "https://humor-game.local.test"
---
apiVersion: v1
kind: Secret
metadata:
  name: humor-game-secrets
  namespace: humor-game
type: Opaque
stringData:
  DB_PASSWORD: "gamepass123"
  REDIS_PASSWORD: "gamepass123"
  JWT_SECRET: "95Ywi2hH9olJiwgD1I60beeFb+WHpo9UfyzMuIZ+N9c="
```

**k8s/postgres.yaml** - Your game's database:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: humor-game
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: DB_NAME
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: DB_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: humor-game-secrets
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: init-scripts
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - gameuser
            - -d
            - humor_memory_game
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-storage
        emptyDir: {}
      - name: init-scripts
        configMap:
          name: postgres-init
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: humor-game
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init
  namespace: humor-game
data:
  01-init.sql: |
    -- Your database/combined-init.sql content goes here
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    -- ... (copy your actual init script)
```

**k8s/redis.yaml** - Session cache:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: humor-game
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - --appendonly
        - "yes"
        - --requirepass
        - $(REDIS_PASSWORD)
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: humor-game-secrets
              key: REDIS_PASSWORD
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        readinessProbe:
          exec:
            command:
            - redis-cli
            - -a
            - $(REDIS_PASSWORD)
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: humor-game
spec:
  selector:
    app: redis
  ports:
  - port: 6379
```

**k8s/backend.yaml** - Your Node.js API:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: humor-game
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: localhost:5001/humor-game/backend:v1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: API_PORT
        - name: DB_HOST
          value: "postgres"
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: DB_NAME
        - name: DB_USER
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: DB_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: humor-game-secrets
              key: DB_PASSWORD
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: REDIS_HOST
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: humor-game-secrets
              key: REDIS_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: humor-game-secrets
              key: JWT_SECRET
        - name: CORS_ORIGIN
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: CORS_ORIGIN
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: humor-game
spec:
  selector:
    app: backend
  ports:
  - port: 3001
```

**k8s/frontend.yaml** - Your game's UI:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: humor-game
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: localhost:5001/humor-game/frontend:v1.0.0
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "32Mi"
            cpu: "25m"
          limits:
            memory: "64Mi"
            cpu: "50m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: humor-game
spec:
  selector:
    app: frontend
  ports:
  - port: 80
```

**k8s/ingress.yaml** - Route traffic to your game:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: humor-game-ingress
  namespace: humor-game
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  tls:
  - hosts:
    - humor-game.local.test
    secretName: humor-game-tls
  rules:
  - host: humor-game.local.test
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### Deploy Your Game

```bash
# Copy TLS secret to game namespace
kubectl get secret humor-game-tls -o yaml | \
  sed 's/namespace: default/namespace: humor-game/' | \
  kubectl apply -f -

# Deploy everything
kubectl apply -f k8s/

# Watch the magic happen
kubectl get pods -n humor-game -w
```

Wait for all pods to show `Running`:

```bash
kubectl wait --for=condition=ready pod -l app=postgres -n humor-game --timeout=60s
kubectl wait --for=condition=ready pod -l app=redis -n humor-game --timeout=60s
kubectl wait --for=condition=ready pod -l app=backend -n humor-game --timeout=60s
kubectl wait --for=condition=ready pod -l app=frontend -n humor-game --timeout=60s
```

**✅ Checkpoint**: Open `https://humor-game.local.test` - your memory game is now running on Kubernetes!

---

## 6. Automation I - Supercharge Your Makefile

Your existing Makefile is good, but let's adapt it for Kubernetes workflows. We'll keep the same commands but make them work with your new setup.

### Enhanced Makefile

Replace your current `Makefile` with this Kubernetes-aware version:

```makefile
# Humor Memory Game - Kubernetes Edition
.PHONY: help build push deploy logs restart status clean reset-cluster

# Configuration
REGISTRY := localhost:5001
APP := humor-game
VERSION := $(shell git rev-parse --short HEAD)
NAMESPACE := humor-game
K3D_CLUSTER := humor-game-cluster

help: ## 📖 Show this help message
	@echo '🎮 Humor Memory Game - Kubernetes Edition'
	@echo ''
	@echo 'Usage: make [target]'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## 🚀 Initial setup (cluster + registry)
	@echo "🎮 Setting up Humor Memory Game Kubernetes environment..."
	@docker run -d --restart=always -p 5001:5000 --name k3d-registry registry:2 2>/dev/null || true
	@k3d cluster create --config k3d-config.yaml --wait || true
	@kubectl config use-context k3d-$(K3D_CLUSTER)
	@helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx --force-update
	@helm install ingress-nginx ingress-nginx/ingress-nginx \
		--namespace ingress-nginx --create-namespace \
		--set controller.hostNetwork=true --set controller.hostPort.enabled=true \
		--set controller.hostPort.ports.http=80 --set controller.hostPort.ports.https=443 \
		--wait 2>/dev/null || true
	@mkcert -install
	@mkcert "humor-game.local.test" "*.127.0.0.1.sslip.io" localhost 127.0.0.1
	@kubectl create secret tls humor-game-tls \
		--cert=humor-game.local.test+3.pem \
		--key=humor-game.local.test+3-key.pem 2>/dev/null || true
	@echo "127.0.0.1 humor-game.local.test" | sudo tee -a /etc/hosts >/dev/null || true
	@echo "✅ Setup complete! Run 'make build push deploy' to start your game"

build: ## 🏗️ Build Docker images
	@echo "🏗️ Building images for version $(VERSION)..."
	@docker build -t $(REGISTRY)/$(APP)/backend:$(VERSION) backend/
	@docker build -t $(REGISTRY)/$(APP)/frontend:$(VERSION) frontend/
	@echo "✅ Images built successfully!"

push: build ## 📤 Push images to registry
	@echo "📤 Pushing images..."
	@docker push $(REGISTRY)/$(APP)/backend:$(VERSION)
	@docker push $(REGISTRY)/$(APP)/frontend:$(VERSION)
	@echo "✅ Images pushed successfully!"

deploy: push ## 🚀 Deploy to Kubernetes
	@echo "🚀 Deploying Humor Memory Game v$(VERSION)..."
	@# Update image tags in manifests
	@sed -i.bak 's|image: $(REGISTRY)/$(APP)/backend:.*|image: $(REGISTRY)/$(APP)/backend:$(VERSION)|g' k8s/backend.yaml
	@sed -i.bak 's|image: $(REGISTRY)/$(APP)/frontend:.*|image: $(REGISTRY)/$(APP)/frontend:$(VERSION)|g' k8s/frontend.yaml
	@# Apply all manifests
	@kubectl apply -f k8s/
	@# Wait for rollout
	@kubectl rollout status deployment/backend -n $(NAMESPACE) --timeout=120s
	@kubectl rollout status deployment/frontend -n $(NAMESPACE) --timeout=120s
	@echo "✅ Game deployed successfully!"
	@echo "🎮 Play at: https://humor-game.local.test"

logs: ## 📝 Show logs from all services
	@echo "📝 Game logs (Ctrl+C to stop):"
	@kubectl logs -f -l app=backend -n $(NAMESPACE) --tail=50

logs-backend: ## 📝 Show backend logs only
	@kubectl logs -f -l app=backend -n $(NAMESPACE) --tail=50

logs-frontend: ## 📝 Show frontend logs only  
	@kubectl logs -f -l app=frontend -n $(NAMESPACE) --tail=50

logs-db: ## 📝 Show database logs only
	@kubectl logs -f -l app=postgres -n $(NAMESPACE) --tail=50

restart: ## 🔄 Restart game services
	@echo "🔄 Restarting game services..."
	@kubectl rollout restart deployment/backend -n $(NAMESPACE)
	@kubectl rollout restart deployment/frontend -n $(NAMESPACE)
	@echo "✅ Services restarted!"

status: ## 📊 Show service status
	@echo "📊 Game Status:"
	@kubectl get pods,svc,ingress -n $(NAMESPACE)
	@echo ""
	@echo "🔗 Access URLs:"
	@echo "  Game: https://humor-game.local.test"
	@echo "  API Health: https://humor-game.local.test/api/health"

health: ## ❤️ Check service health
	@echo "❤️ Health Checks:"
	@kubectl get pods -n $(NAMESPACE)
	@echo ""
	@echo "Service Health:"
	@curl -s https://humor-game.local.test/api/health | jq . || echo "❌ API not responding"
	@curl -s https://humor-game.local.test >/dev/null && echo "✅ Frontend: Healthy" || echo "❌ Frontend: Unhealthy"

shell-backend: ## 🐚 Access backend pod shell
	@kubectl exec -it $$(kubectl get pod -l app=backend -n $(NAMESPACE) -o jsonpath='{.items[0].metadata.name}') -n $(NAMESPACE) -- sh

shell-db: ## 🐚 Access database shell
	@kubectl exec -it $$(kubectl get pod -l app=postgres -n $(NAMESPACE) -o jsonpath='{.items[0].metadata.name}') -n $(NAMESPACE) -- psql -U gameuser -d humor_memory_game

clean: ## 🧹 Clean up game deployment
	@echo "🧹 Cleaning up game deployment..."
	@kubectl delete namespace $(NAMESPACE) --timeout=60s || true
	@echo "✅ Game cleanup complete!"

reset-cluster: ## 💥 Reset everything (cluster + registry)
	@echo "💥 Resetting entire cluster..."
	@k3d cluster delete $(K3D_CLUSTER) || true
	@docker rm -f k3d-registry || true
	@echo "✅ Cluster reset complete! Run 'make setup' to start over"

quick: build push ## ⚡ Quick build and push (no deploy)
	@echo "⚡ Quick build complete!"

full: clean setup deploy ## 🎯 Full reset and deploy
	@echo "🎯 Full deployment complete!"
```

### Enhanced Development Workflow

Add these useful automation targets:

```makefile
# Add to your Makefile

dev-setup: ## 🔧 Setup development tools
	@echo "🔧 Installing development tools..."
	@pip install pre-commit
	@npm install -g yaml-lint dockerfile-lint

lint: ## 🔍 Lint all files
	@echo "🔍 Linting Kubernetes manifests..."
	@for file in k8s/*.yaml; do \
		echo "Checking $$file..."; \
		kubectl apply --dry-run=client -f $$file >/dev/null || exit 1; \
	done
	@echo "✅ All manifests are valid!"

test-local: ## 🧪 Test services locally
	@echo "🧪 Testing game endpoints..."
	@curl -f https://humor-game.local.test/api/health || echo "❌ API health check failed"
	@curl -f https://humor-game.local.test/ >/dev/null || echo "❌ Frontend check failed"
	@echo "✅ Local tests complete!"

backup: ## 💾 Backup game database
	@echo "💾 Creating database backup..."
	@kubectl exec $$(kubectl get pod -l app=postgres -n $(NAMESPACE) -o jsonpath='{.items[0].metadata.name}') -n $(NAMESPACE) -- \
		pg_dump -U gameuser humor_memory_game > backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "✅ Database backup created!"
```

### Pre-commit Hooks

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/adrienverge/yamllint
    rev: v1.35.1
    hooks:
      - id: yamllint
        args: [-c=.yamllint.yml]
        
  - repo: https://github.com/hadolint/hadolint
    rev: v2.12.0
    hooks:
      - id: hadolint-docker
        files: backend/Dockerfile|frontend/Dockerfile
        
  - repo: local
    hooks:
      - id: k8s-validate
        name: Validate Kubernetes manifests
        entry: bash -c 'for f in k8s/*.yaml; do kubectl apply --dry-run=client -f "$f" >/dev/null || exit 1; done'
        language: system
        files: '^k8s/.*\.yaml$'
        pass_filenames: false
```

Install and test:

```bash
make dev-setup
pre-commit install
pre-commit run --all-files
```

**✅ Checkpoint**: Run `make clean deploy` - your game redeploys with the new version automatically.

---

## 7. Observability - Monitor Your Game

Let's add professional monitoring so you can see how your game performs in real-time.

### Install Prometheus + Grafana

```bash
# Add Prometheus community charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create values file for your game
cat << EOF > monitoring-values.yaml
prometheus:
  prometheusSpec:
    retention: 7d
    resources:
      requests:
        memory: "400Mi"
        cpu: "200m"
      limits:
        memory: "800Mi"
        cpu: "400m"

grafana:
  adminPassword: "humor-game-admin"
  resources:
    requests:
      memory: "100Mi"
      cpu: "100m"
    limits:
      memory: "200Mi"
      cpu: "200m"
  persistence:
    enabled: false
  service:
    type: ClusterIP

alertmanager:
  enabled: false
EOF

# Install the monitoring stack
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring-values.yaml \
  --wait
```

### Access Grafana

```bash
# Wait for Grafana to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n monitoring --timeout=120s

# Get the admin password
echo "Grafana admin password: humor-game-admin"

# Port forward to access Grafana
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring
```

Open `http://localhost:3000`:
- Username: `admin`
- Password: `humor-game-admin`

### Key Dashboards for Your Game

Once in Grafana, explore these pre-built dashboards:

1. **Kubernetes / Compute Resources / Cluster** - Overall cluster health
2. **Kubernetes / Compute Resources / Namespace (Pods)** - Your game's resource usage  
3. **Kubernetes / Compute Resources / Pod** - Individual pod metrics
4. **Node Exporter / Nodes** - Host system metrics

### Custom Dashboard for Game Metrics

Create a custom dashboard for your game:

```bash
# Create a ConfigMap with your custom dashboard
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: humor-game-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  humor-game-dashboard.json: |
    {
      "dashboard": {
        "id": null,
        "title": "Humor Memory Game",
        "tags": ["humor-game"],
        "timezone": "browser",
        "panels": [
          {
            "id": 1,
            "title": "Frontend Pods Status",
            "type": "stat",
            "targets": [
              {
                "expr": "sum(up{job=\"kubernetes-pods\",kubernetes_namespace=\"humor-game\",kubernetes_pod_label_app=\"frontend\"})",
                "legendFormat": "Frontend Pods"
              }
            ],
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
          },
          {
            "id": 2,
            "title": "Backend Pods Status",
            "type": "stat",
            "targets": [
              {
                "expr": "sum(up{job=\"kubernetes-pods\",kubernetes_namespace=\"humor-game\",kubernetes_pod_label_app=\"backend\"})",
                "legendFormat": "Backend Pods"
              }
            ],
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
          },
          {
            "id": 3,
            "title": "Pod Memory Usage",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(container_memory_usage_bytes{namespace=\"humor-game\"}) by (pod)",
                "legendFormat": "{{pod}}"
              }
            ],
            "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
          }
        ],
        "time": {"from": "now-1h", "to": "now"},
        "refresh": "5s"
      }
    }
EOF
```

### Add Monitoring to Makefile

Add these targets to your Makefile:

```makefile
monitor-setup: ## 📊 Setup monitoring stack
	@echo "📊 Installing monitoring for your game..."
	@helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update
	@helm install monitoring prometheus-community/kube-prometheus-stack \
		--namespace monitoring --create-namespace \
		--values monitoring-values.yaml --wait
	@echo "✅ Monitoring installed!"
	@echo "🎯 Access Grafana: kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring"
	@echo "🔑 Username: admin, Password: humor-game-admin"

monitor: ## 📈 Open Grafana dashboard
	@echo "🎯 Opening Grafana dashboard..."
	@kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring &
	@echo "📊 Grafana running at http://localhost:3000"
	@echo "🔑 Username: admin, Password: humor-game-admin"

monitor-stop: ## 📊 Stop monitoring port-forward
	@pkill -f "kubectl port-forward svc/monitoring-grafana" || true
	@echo "📊 Monitoring port-forward stopped"
```

**✅ Checkpoint**: Run `make monitor-setup && make monitor` - you can now see real-time metrics of your game's performance!

---

## 8. GitOps with ArgoCD

Time to implement GitOps - your game will automatically deploy when you push to Git. No more manual deployments!

### Install ArgoCD

```bash
# Create namespace and install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s
```

### Access ArgoCD UI

```bash
# Get the admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD admin password: $ARGOCD_PASSWORD"

# Port forward to access ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8080:443 --address=0.0.0.0 &
echo "🎯 ArgoCD UI: https://localhost:8080"
echo "👤 Username: admin"
echo "🔑 Password: $ARGOCD_PASSWORD"
```

### Prepare GitOps Repository Structure

Reorganize your manifests for GitOps:

```bash
# Create GitOps structure
mkdir -p gitops/humor-game/{base,overlays/dev}

# Move manifests to base
cp k8s/*.yaml gitops/humor-game/base/

# Create base kustomization
cat << 'EOF' > gitops/humor-game/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml
  - configmap.yaml
  - postgres.yaml
  - redis.yaml
  - backend.yaml
  - frontend.yaml
  - ingress.yaml

images:
  - name: localhost:5001/humor-game/backend
    newTag: v1.0.0
  - name: localhost:5001/humor-game/frontend
    newTag: v1.0.0

commonLabels:
  app.kubernetes.io/name: humor-memory-game
  app.kubernetes.io/instance: dev
EOF

# Create dev overlay
cat << 'EOF' > gitops/humor-game/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: humor-game

resources:
  - ../../base

patchesStrategicMerge:
  - replica-patch.yaml

images:
  - name: localhost:5001/humor-game/backend
    newTag: v1.0.0
  - name: localhost:5001/humor-game/frontend
    newTag: v1.0.0
EOF

# Create replica patch for dev environment
cat << 'EOF' > gitops/humor-game/overlays/dev/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
EOF
```

### Create ArgoCD Application

```bash
# Create ArgoCD application for your game
cat << EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: humor-memory-game
  namespace: argocd
spec:
  project: default
  source:
    repoURL: $(git remote get-url origin)
    targetRevision: HEAD
    path: gitops/humor-game/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: humor-game
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
  revisionHistoryLimit: 10
EOF
```

**Note**: If you haven't pushed your code to Git yet:

```bash
# Initialize git repo (if not already done)
git init
git add .
git commit -m "Initial Kubernetes setup"

# Create GitHub repo and push
# Replace with your actual repo URL
git remote add origin https://github.com/yourusername/humor-memory-game.git
git push -u origin main
```

### Test GitOps Flow

```bash
# Update image tag in GitOps repo
sed -i 's/newTag: v1.0.0/newTag: v1.0.1/g' gitops/humor-game/overlays/dev/kustomization.yaml

# Commit and push
git add gitops/
git commit -m "Update game to v1.0.1"
git push

# Watch ArgoCD sync automatically (within 3 minutes)
kubectl get pods -n humor-game -w
```

### Add GitOps to Makefile

```makefile
# Add to your Makefile

argocd-setup: ## 🚀 Setup ArgoCD
	@echo "🚀 Installing ArgoCD..."
	@kubectl create namespace argocd || true
	@kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
	@kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s
	@echo "✅ ArgoCD installed!"

argocd: ## 🎯 Open ArgoCD dashboard
	@ARGOCD_PASSWORD=$$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d); \
	echo "🎯 ArgoCD UI: https://localhost:8080"; \
	echo "👤 Username: admin"; \
	echo "🔑 Password: $$ARGOCD_PASSWORD"; \
	kubectl port-forward svc/argocd-server -n argocd 8080:443 --address=0.0.0.0

gitops-deploy: push ## 🔄 GitOps deployment (update and commit)
	@echo "🔄 Updating GitOps repo with version $(VERSION)..."
	@sed -i.bak 's/newTag: .*/newTag: $(VERSION)/g' gitops/humor-game/overlays/dev/kustomization.yaml
	@git add gitops/
	@git commit -m "🚀 Deploy humor-game $(VERSION)" || true
	@git push
	@echo "✅ GitOps update committed! ArgoCD will sync automatically"
	@echo "🎯 Watch sync: kubectl get pods -n $(NAMESPACE) -w"
```

**✅ Checkpoint**: Make a code change, run `make gitops-deploy`, then watch ArgoCD automatically sync your changes to Kubernetes!

---

## 9. Automation II - Full CI/CD Pipeline

Now let's create a complete CI/CD pipeline that builds, tests, and deploys your game automatically when you push code.

### Self-hosted GitHub Actions Runner

Set up a runner on your machine:

```bash
# Create runner directory
mkdir actions-runner && cd actions-runner

# Download latest runner for your OS
# Linux/macOS
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure runner (get token from GitHub repo Settings > Actions > Runners)
./config.sh --url https://github.com/yourusername/humor-memory-game --token YOUR_RUNNER_TOKEN

# Install as service (optional)
sudo ./svc.sh install
sudo ./svc.sh start

# Or run manually
./run.sh
```

### Complete CI/CD Workflow

Create `.github/workflows/ci-cd.yml`:

```yaml
name: Humor Memory Game CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: localhost:5001
  IMAGE_TAG: ${{ github.sha }}

jobs:
  lint-and-test:
    runs-on: self-hosted
    steps:
    - uses: actions/checkout@v4
    
    - name: 🔍 Lint Kubernetes manifests
      run: |
        for file in k8s/*.yaml gitops/**/*.yaml; do
          if [ -f "$file" ]; then
            echo "Validating $file..."
            kubectl apply --dry-run=client -f "$file" >/dev/null
          fi
        done
    
    - name: 🔍 Lint Dockerfiles
      run: |
        docker run --rm -i hadolint/hadolint < backend/Dockerfile
        docker run --rm -i hadolint/hadolint < frontend/Dockerfile
    
    - name: 🔒 Security scan - Trivy filesystem
      run: |
        docker run --rm -v ${{ github.workspace }}:/workspace aquasec/trivy:latest fs /workspace --exit-code 0 --format table

  build-and-push:
    needs: lint-and-test
    runs-on: self-hosted
    if: github.ref == 'refs/heads/main'
    outputs:
      image-tag: ${{ steps.meta.outputs.image-tag }}
    
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: 📦 Generate image metadata
      id: meta
      run: |
        SHORT_SHA=$(git rev-parse --short HEAD)
        echo "image-tag=$SHORT_SHA" >> $GITHUB_OUTPUT
        echo "🏷️ Image tag: $SHORT_SHA"
    
    - name: 🏗️ Build backend image
      run: |
        docker build -t ${{ env.REGISTRY }}/humor-game/backend:${{ steps.meta.outputs.image-tag }} backend/
        docker build -t ${{ env.REGISTRY }}/humor-game/backend:latest backend/
    
    - name: 🏗️ Build frontend image
      run: |
        docker build -t ${{ env.REGISTRY }}/humor-game/frontend:${{ steps.meta.outputs.image-tag }} frontend/
        docker build -t ${{ env.REGISTRY }}/humor-game/frontend:latest frontend/
    
    - name: 🔒 Security scan - Images
      run: |
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image \
          ${{ env.REGISTRY }}/humor-game/backend:${{ steps.meta.outputs.image-tag }} --exit-code 0
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image \
          ${{ env.REGISTRY }}/humor-game/frontend:${{ steps.meta.outputs.image-tag }} --exit-code 0
    
    - name: 📤 Push images
      run: |
        docker push ${{ env.REGISTRY }}/humor-game/backend:${{ steps.meta.outputs.image-tag }}
        docker push ${{ env.REGISTRY }}/humor-game/backend:latest
        docker push ${{ env.REGISTRY }}/humor-game/frontend:${{ steps.meta.outputs.image-tag }}
        docker push ${{ env.REGISTRY }}/humor-game/frontend:latest

  deploy:
    needs: build-and-push
    runs-on: self-hosted
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        fetch-depth: 0
    
    - name: 🔄 Update GitOps manifests
      run: |
        IMAGE_TAG=${{ needs.build-and-push.outputs.image-tag }}
        echo "🏷️ Updating to image tag: $IMAGE_TAG"
        
        # Update kustomization with new image tags
        sed -i "s|newTag: .*|newTag: $IMAGE_TAG|g" gitops/humor-game/overlays/dev/kustomization.yaml
        
        # Verify changes
        echo "📝 GitOps changes:"
        git diff gitops/humor-game/overlays/dev/kustomization.yaml
    
    - name: 🚀 Commit and push GitOps changes
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add gitops/humor-game/overlays/dev/kustomization.yaml
        git commit -m "🚀 Deploy humor-game ${{ needs.build-and-push.outputs.image-tag }}"
        git push
    
    - name: ⏳ Wait for ArgoCD sync
      run: |
        echo "⏳ Waiting for ArgoCD to sync deployment..."
        kubectl wait --for=condition=progressing deployment/backend -n humor-game --timeout=300s
        kubectl wait --for=condition=progressing deployment/frontend -n humor-game --timeout=300s
        kubectl rollout status deployment/backend -n humor-game --timeout=300s
        kubectl rollout status deployment/frontend -n humor-game --timeout=300s
    
    - name: 🧪 Post-deployment tests
      run: |
        echo "🧪 Running post-deployment tests..."
        kubectl wait --for=condition=ready pod -l app=backend -n humor-game --timeout=120s
        kubectl wait --for=condition=ready pod -l app=frontend -n humor-game --timeout=120s
        
        # Test API health
        kubectl exec $(kubectl get pod -l app=backend -n humor-game -o jsonpath='{.items[0].metadata.name}') -n humor-game -- \
          curl -f http://localhost:3001/health
        
        echo "✅ Deployment successful!"

  notify:
    needs: [build-and-push, deploy]
    runs-on: self-hosted
    if: always()
    
    steps:
    - name: 📢 Deployment notification
      run: |
        if [ "${{ needs.deploy.result }}" == "success" ]; then
          echo "🎉 Humor Memory Game successfully deployed!"
          echo "🎮 Version: ${{ needs.build-and-push.outputs.image-tag }}"
          echo "🌐 Play at: https://humor-game.local.test"
        else
          echo "❌ Deployment failed!"
          echo "🔍 Check the logs for details"
        fi
```

### ArgoCD Image Updater (Alternative)

If you prefer automatic image updates without manual GitOps commits:

```bash
# Install ArgoCD Image Updater
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/manifests/install.yaml

# Configure your application for auto-updates
kubectl patch application humor-memory-game -n argocd --type='merge' -p='{
  "metadata": {
    "annotations": {
      "argocd-image-updater.argoproj.io/image-list": "backend=localhost:5001/humor-game/backend,frontend=localhost:5001/humor-game/frontend",
      "argocd-image-updater.argoproj.io/write-back-method": "git",
      "argocd-image-updater.argoproj.io/git-branch": "main"
    }
  }
}'
```

### Dependency Updates with Renovate

Create `.github/renovate.json`:

```json
{
  "extends": ["config:base"],
  "dockerfile": {
    "enabled": true
  },
  "kubernetes": {
    "enabled": true,
    "fileMatch": ["k8s/.+\\.yaml$", "gitops/.+\\.yaml$"]
  },
  "regexManagers": [
    {
      "fileMatch": ["k8s/.+\\.yaml$", "gitops/.+\\.yaml$"],
      "matchStrings": ["image: (?<depName>.*):(?<currentValue>.*?)\\n"],
      "datasourceTemplate": "docker"
    }
  ],
  "schedule": ["before 6am on monday"],
  "assignees": ["@yourusername"]
}
```

### Enhanced Makefile for CI/CD

Add these targets:

```makefile
# Add to your Makefile

ci-setup: ## 🤖 Setup CI/CD tools
	@echo "🤖 Setting up CI/CD tools..."
	@# Install additional tools for CI/CD
	@which trivy || (curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin)
	@which hadolint || (curl -sL https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64 -o /usr/local/bin/hadolint && chmod +x /usr/local/bin/hadolint)
	@echo "✅ CI/CD tools installed!"

security-scan: ## 🔒 Run security scans
	@echo "🔒 Running security scans..."
	@trivy fs . --exit-code 0 --format table
	@trivy image $(REGISTRY)/$(APP)/backend:$(VERSION) --exit-code 0
	@trivy image $(REGISTRY)/$(APP)/frontend:$(VERSION) --exit-code 0
	@echo "✅ Security scans complete!"

pipeline-test: ## 🧪 Test full pipeline locally
	@echo "🧪 Testing CI/CD pipeline locally..."
	@make lint
	@make security-scan
	@make build push
	@make gitops-deploy
	@echo "✅ Pipeline test complete!"

# Override gitops-deploy to include more automation
gitops-deploy: push security-scan ## 🔄 Full GitOps deployment with security
	@echo "🔄 Updating GitOps repo with version $(VERSION)..."
	@sed -i.bak 's/newTag: .*/newTag: $(VERSION)/g' gitops/humor-game/overlays/dev/kustomization.yaml
	@git add gitops/
	@git commit -m "🚀 Deploy humor-game $(VERSION) [skip ci]" || true
	@git push
	@echo "✅ GitOps update committed! ArgoCD will sync automatically"
	@echo "🎯 Watch sync: kubectl get pods -n $(NAMESPACE) -w"
```

**✅ Checkpoint**: Push code to main branch → GitHub Actions builds and pushes images → ArgoCD automatically deploys → Your game updates with zero manual intervention!

---

## 10. Secure Public Access

Finally, let's make your game accessible from anywhere on the internet without exposing your home network or configuring routers.

### Setup Cloudflare Tunnel

First, you'll need a domain name. You can use:
- A free domain from Freenom
- A cheap domain from Namecheap/GoDaddy
- A subdomain if you already own a domain

For this example, we'll use `yourdomain.com`.

```bash
# Login to Cloudflare (opens browser)
cloudflared tunnel login

# Create tunnel for your game
cloudflared tunnel create humor-game-tunnel

# Get the tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep humor-game-tunnel | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# Create tunnel configuration
mkdir -p ~/.cloudflared
cat << EOF > ~/.cloudflared/config.yml
tunnel: humor-game-tunnel
credentials-file: ~/.cloudflared/$TUNNEL_ID.json

ingress:
  # Your game's main URL
  - hostname: game.yourdomain.com
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
  
  # Monitoring endpoints
  - hostname: monitoring.yourdomain.com
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
  
  # ArgoCD access
  - hostname: argocd.yourdomain.com
    service: https://localhost:8080
    originRequest:
      noTLSVerify: true
  
  # Catch-all rule (required)
  - service: http_status:404
EOF
```

### Setup DNS Records

```bash
# Create DNS records for your domains
cloudflared tunnel route dns humor-game-tunnel game.yourdomain.com
cloudflared tunnel route dns humor-game-tunnel monitoring.yourdomain.com
cloudflared tunnel route dns humor-game-tunnel argocd.yourdomain.com
```

### Update Your Game's Configuration

Update your Kubernetes manifests to support the public domain:

```bash
# Create production ingress for public access
cat << EOF > k8s/ingress-public.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: humor-game-public-ingress
  namespace: humor-game
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - game.yourdomain.com
    secretName: humor-game-tls
  rules:
  - host: game.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
EOF

# Apply the public ingress
kubectl apply -f k8s/ingress-public.yaml
```

### Run the Tunnel

```bash
# Test the tunnel
cloudflared tunnel run humor-game-tunnel

# If everything works, install as a service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Check tunnel status
cloudflared tunnel info humor-game-tunnel
systemctl status cloudflared
```

### Optional: Zero Trust Access

Add an extra security layer with Cloudflare Zero Trust:

1. Go to Cloudflare Zero Trust dashboard
2. Navigate to Access → Applications → Add Application
3. Configure:
   - **Application Domain**: `game.yourdomain.com`
   - **Identity Provider**: Email (or Google/GitHub)
   - **Policy**: Allow emails ending in `@yourcompany.com` or specific emails

### Update CORS for Public Access

Update your backend configuration to allow the new domain:

```bash
# Update the ConfigMap to include the public domain
kubectl patch configmap humor-game-config -n humor-game --patch='
data:
  CORS_ORIGIN: "https://game.yourdomain.com"
'

# Restart backend to pick up new config
kubectl rollout restart deployment/backend -n humor-game
```

### Monitoring Public Access

Add public access monitoring to your Makefile:

```makefile
# Add to your Makefile

tunnel-setup: ## 🌐 Setup Cloudflare tunnel
	@echo "🌐 Setting up secure tunnel access..."
	@echo "📋 Prerequisites:"
	@echo "   1. Domain name configured in Cloudflare"
	@echo "   2. cloudflared installed and authenticated"
	@echo ""
	@echo "🔧 Run these commands:"
	@echo "   cloudflared tunnel create humor-game-tunnel"
	@echo "   cloudflared tunnel route dns humor-game-tunnel game.yourdomain.com"
	@echo "   cloudflared tunnel run humor-game-tunnel"

tunnel: ## 🚀 Start Cloudflare tunnel
	@echo "🚀 Starting secure tunnel..."
	@cloudflared tunnel run humor-game-tunnel

tunnel-status: ## 📊 Check tunnel status
	@echo "📊 Tunnel Status:"
	@cloudflared tunnel info humor-game-tunnel 2>/dev/null || echo "❌ Tunnel not found"
	@systemctl is-active cloudflared 2>/dev/null && echo "✅ Tunnel service running" || echo "❌ Tunnel service not running"

public-test: ## 🌐 Test public access
	@echo "🌐 Testing public access..."
	@echo "🎮 Game: https://game.yourdomain.com"
	@curl -s -o /dev/null -w "Game: %{http_code}\n" https://game.yourdomain.com/ || echo "❌ Game not accessible"
	@curl -s -o /dev/null -w "API: %{http_code}\n" https://game.yourdomain.com/api/health || echo "❌ API not accessible"
	@echo "📊 Monitoring: https://monitoring.yourdomain.com"
	@echo "🚀 ArgoCD: https://argocd.yourdomain.com"
```

### Production Checklist

Before going fully public, ensure:

```bash
# Security checklist
make security-scan

# Performance test
kubectl top pods -n humor-game

# Backup your data
make backup

# Test disaster recovery
make clean setup deploy
```

**✅ Checkpoint**: Your Humor Memory Game is now securely accessible from anywhere in the world at `https://game.yourdomain.com`!

---

## Appendix A: Troubleshooting Your Game

### Common Issues and Solutions

**ImagePullBackOff Errors**
```bash
# Check if registry is running
docker ps | grep registry

# Test registry connectivity
kubectl run test --image=busybox -it --rm -- nslookup k3d-registry

# Verify your images exist
curl http://localhost:5001/v2/_catalog
curl http://localhost:5001/v2/humor-game/backend/tags/list
```

**Ingress 404 Errors**
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Verify ingress resource
kubectl describe ingress humor-game-ingress -n humor-game

# Check service endpoints
kubectl get endpoints -n humor-game

# Verify hosts file
grep "humor-game.local.test" /etc/hosts
```

**Database Connection Issues**
```bash
# Check postgres pod
kubectl logs -l app=postgres -n humor-game

# Test database connectivity
kubectl exec -it $(kubectl get pod -l app=postgres -n humor-game -o jsonpath='{.items[0].metadata.name}') -n humor-game -- \
  psql -U gameuser -d humor_memory_game -c "SELECT NOW();"

# Check if database is initialized
kubectl exec -it $(kubectl get pod -l app=postgres -n humor-game -o jsonpath='{.items[0].metadata.name}') -n humor-game -- \
  psql -U gameuser -d humor_memory_game -c "\dt"
```

**Backend API Issues**
```bash
# Check backend logs
kubectl logs -l app=backend -n humor-game --tail=50

# Test API directly
kubectl port-forward svc/backend 3001:3001 -n humor-game &
curl http://localhost:3001/health

# Check environment variables
kubectl exec -it $(kubectl get pod -l app=backend -n humor-game -o jsonpath='{.items[0].metadata.name}') -n humor-game -- env | grep -E "(DB_|REDIS_)"
```

**Redis Connection Issues**
```bash
# Check Redis pod
kubectl logs -l app=redis -n humor-game

# Test Redis connectivity
kubectl exec -it $(kubectl get pod -l app=redis -n humor-game -o jsonpath='{.items[0].metadata.name}') -n humor-game -- \
  redis-cli -a gamepass123 ping
```

**TLS Certificate Problems**
```bash
# Regenerate certificates
rm -f *.pem
mkcert "humor-game.local.test" "*.127.0.0.1.sslip.io" localhost 127.0.0.1

# Update TLS secret
kubectl delete secret humor-game-tls -n humor-game
kubectl create secret tls humor-game-tls \
  --cert=humor-game.local.test+3.pem \
  --key=humor-game.local.test+3-key.pem \
  -n humor-game
```

### Emergency Recovery Commands

```bash
# Nuclear option - full reset
make reset-cluster
make setup
make build push deploy

# Restart all game services
kubectl rollout restart deployment -n humor-game

# View all game resources
kubectl get all -n humor-game

# Emergency backup
kubectl exec $(kubectl get pod -l app=postgres -n humor-game -o jsonpath='{.items[0].metadata.name}') -n humor-game -- \
  pg_dump -U gameuser humor_memory_game > emergency-backup.sql
```

---

## Appendix B: Advanced Configurations

### Horizontal Pod Autoscaling

Scale your game based on CPU usage:

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: humor-game
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: humor-game
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Backup CronJob

Automatic daily backups:

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: humor-game
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: humor-game-secrets
                  key: DB_PASSWORD
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="/backups/humor-game-$(date +%Y%m%d-%H%M%S).sql"
              pg_dump -h postgres -U gameuser -d humor_memory_game > $BACKUP_FILE
              echo "Backup created: $BACKUP_FILE"
              # Keep only last 7 days
              find /backups -name "humor-game-*.sql" -mtime +7 -delete
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            hostPath:
              path: /tmp/game-backups
              type: DirectoryOrCreate
          restartPolicy: OnFailure
```

### Network Policies (Security)

Restrict pod-to-pod communication:

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: humor-game-network-policy
  namespace: humor-game
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  - from:
    - podSelector: {}
    ports:
    - protocol: TCP
      port: 3001
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
  egress:
  - {}  # Allow all egress (can be restricted further)
```

### Resource Quotas

Prevent resource overconsumption:

```yaml
# k8s/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: humor-game-quota
  namespace: humor-game
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 2Gi
    limits.cpu: "2"
    limits.memory: 4Gi
    pods: "10"
    persistentvolumeclaims: "2"
```

---

**🎉 Congratulations!** You've transformed your Humor Memory Game from a simple Docker Compose application into a production-ready Kubernetes deployment with GitOps, monitoring, CI/CD, and secure public access. You now have hands-on experience with the same tools and practices used by engineering teams at major tech companies - all running on your laptop for $0/month!

**Next Steps:**
- Try deploying other applications using the same patterns
- Experiment with different Kubernetes resources
- Add more sophisticated monitoring and alerting
- Explore service mesh (Istio) for advanced traffic management
- Practice disaster recovery scenarios

**You're now ready to confidently discuss and implement DevOps practices in any professional environment! 🚀**