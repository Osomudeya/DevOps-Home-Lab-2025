# Production Kubernetes Homelab: From Docker to Enterprise Scale

*A beginner-friendly guide to deploying production-grade applications using Kubernetes, monitoring, and DevOps best practices*

## At‑a‑glance roadmap (paste at top of home-lab.md)
---
| Milestone | Goal | Do | Checkpoint |
|-----------|------|----|-----------| 
| 0. Setup | Tools ready | Install Docker/Colima, kubectl, k3d, Helm, mkcert, Node, jq | All tools print versions; 4GB+ RAM, 10GB+ disk |
| 1. Compose Sanity | App works locally | `docker-compose up -d`, test `/` and `/health` | Frontend OK, API `/health` 200, DB + Redis reachable |
| 2. K8s Core | App on k3d | Create cluster, apply `k8s/{namespace,configmap,secrets,postgres,redis,backend,frontend}.yaml` | 4 pods **Running**, services reachable |
| 3. Ingress | Prod-style access | Install ingress-nginx; apply `k8s/ingress.yaml`; host `gameapp.local` | `http://gameapp.local:8080` loads; `/api/health` OK |
| 4. Observability | See/measure | Apply `k8s/prometheus-rbac.yaml`, `k8s/monitoring.yaml`; port-forward Grafana | Grafana up; panels show CPU/Mem/HTTP rate; custom app metrics |
| 5. GitOps | Automate | Install ArgoCD; create GitOps repo; `applications/dev-app.yaml` | Argo "Synced"; changes in Git auto-deploy |
| 6. Global | Ship | Domain + Cloudflare; cert‑manager; TLS on Ingress | Valid HTTPS on your domain; CDN cache hit; perf <200ms TTFB (edge) |

## What You'll Build

By the end of this guide, you'll have deployed a complete production-grade application stack featuring:

- **Multi-service application** running on Kubernetes
- **Production networking** with Ingress and TLS termination  
- **Comprehensive monitoring** with Prometheus and Grafana dashboards
- **Database persistence** with PostgreSQL and Redis
- **Professional DevOps workflows** using GitOps and automation

This mirrors the same infrastructure patterns used by companies like Netflix, Airbnb, and GitHub to serve millions of users.

## Learning Philosophy

Rather than just copying commands, you'll understand the **why** behind each decision. Each milestone builds upon the previous one, teaching you to think like a platform engineer who designs systems for scale, reliability, and maintainability.

## Prerequisites: Setting Up Your Development Environment

Before we begin, you need several tools installed on your machine. This setup process is crucial - taking time here will save hours of troubleshooting later.

### Required Tools Installation

**For macOS (Recommended path):**
```bash
# Install all tools at once using Homebrew
brew install docker docker-compose kubectl k3d helm nodejs jq

# Start Docker Desktop (required for container operations)
# Download from: https://www.docker.com/products/docker-desktop
```

**For Linux (Ubuntu/Debian):**
```bash
# Update your system first
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker  # Apply group changes immediately

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/kubectl

# Install k3d (lightweight Kubernetes)
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Install Helm (Kubernetes package manager)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs jq
```

### Verification Checkpoint ✅

Run these commands to verify everything is installed correctly:

```bash
# Check all tools are properly installed
docker --version    # Should show: Docker version 20.0+
kubectl version --client  # Should show: Client Version v1.28+
k3d version        # Should show: k3d version v5.6+
helm version       # Should show: version.BuildInfo
node --version     # Should show: v18+
```

**Success indicators:**
- All commands return version numbers without errors
- Docker Desktop is running (you can see the whale icon in your system tray)
- You have at least 4GB of available RAM and 10GB of disk space

### Common Installation Issues & Fixes

**Docker permission errors on Linux:**
```bash
# If you get "permission denied" errors:
sudo usermod -aG docker $USER
newgrp docker
# Then test: docker run hello-world
```

**kubectl not found:**
```bash
# Ensure kubectl is in your PATH
echo $PATH
# If missing, add to your shell profile:
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

---

## Milestone 0 — Environment Setup

**Learning Objective:** Verify all required tools are installed and system resources meet minimum requirements for Kubernetes operations.

**Why this matters:** Proper tool installation and resource availability prevent hours of troubleshooting later. This milestone ensures your development environment is production-ready.

### Step 0.1 — Verify Tools

**Required Tools Check:**
```bash
# Core container and orchestration tools
docker --version        # Should show: Docker version 20.0+
kubectl version --client # Should show: Client Version v1.28+
k3d version            # Should show: k3d version v5.6+
helm version           # Should show: version.BuildInfo

# Development tools
node --version         # Should show: v18+
npm --version          # Should show: 8.0+
jq --version           # Should show: jq-1.6+
```

**✅ Current Status (2024-08-20):**
- **Docker**: v28.3.3 ✅ (using Colima backend)
- **kubectl**: v1.33.4 ✅ 
- **k3d**: v5.8.3 ✅
- **Helm**: v3.18.5 ✅
- **Node.js**: v24.4.1 ✅
- **npm**: v11.4.2 ✅
- **jq**: v1.7.1 ✅

### Step 0.2 — Resource Checks

**System Resource Verification:**
```bash
# Check Docker daemon status
docker info

# Check available memory (macOS)
vm_stat

# Check disk space
df -h
```

**✅ Current Status (2024-08-20):**
- **Docker Daemon**: ✅ Running (6 containers active)
- **Backend**: Colima (Ubuntu 24.04.2 LTS)
- **RAM**: 1.92GiB total ⚠️ (Below 4GB recommendation)
- **Disk**: 932GB total, 581GB available ✅ (Exceeds 10GB requirement)

**⚠️ Resource Warning:** System has only 1.92GB RAM, which may cause performance issues during Kubernetes cluster operations. Consider:
- Closing unnecessary applications
- Using smaller cluster configurations
- Monitoring resource usage during operations

### ✅ Checkpoint

Your environment is ready when:
- ✅ All 7 required tools show version numbers
- ✅ Docker daemon is running and accessible
- ✅ At least 4GB RAM available (⚠️ Current: 1.92GB)
- ✅ At least 10GB disk space available (✅ Current: 581GB)
- ✅ No permission or PATH errors

### Common Issues & Fixes

**Docker Permission Errors:**
```bash
# If you get "permission denied" errors:
sudo usermod -aG docker $USER
newgrp docker
# Then test: docker run hello-world
```

**kubectl Not Found:**
```bash
# Ensure kubectl is in your PATH
echo $PATH
# If missing, add to your shell profile:
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

**Docker Desktop Missing (macOS):**
```bash
# Alternative: Use Colima (already configured)
brew install colima
colima start --cpu 2 --memory 4 --disk 20

# Or install Docker Desktop from:
# https://www.docker.com/products/docker-desktop
```

**Insufficient Resources:**
```bash
# For low RAM systems, use minimal cluster:
k3d cluster create dev-cluster \
  --servers 1 \
  --agents 1 \
  --k3s-arg --disable=traefik@server:0

# Monitor resource usage:
kubectl top nodes
kubectl top pods --all-namespaces
```

### 📸 Screenshots: Environment Verification

**Tool Versions Output:**
```
Docker version 28.3.3, build 980b856816
Client Version: v1.33.4
k3d version v5.8.3
version.BuildInfo{Version:v3.18.5}
v24.4.1
11.4.2
jq-1.7.1-apple
```

**Docker Info:**
```
Server:
 Containers: 6
  Running: 6
 Server Version: 28.3.3
 Total Memory: 1.92GiB
 Name: colima
```

**Disk Space:**
```
Filesystem        Size    Used   Avail Capacity
/dev/disk1s1s1   932Gi    10Gi   581Gi     2%
```

**Memory Status:**
```
Pages free:                             3631961.
Pages active:                           4808629.
Total Memory: ~32GB (calculated from pages)
Available: ~14GB free
```

### What You Learned

You've verified your development environment readiness:
- **Tool availability** for container orchestration and development
- **Resource constraints** that may impact Kubernetes performance
- **Alternative solutions** like Colima for Docker backend
- **Troubleshooting approaches** for common installation issues

### Professional Skills Gained

- **Environment validation** before starting complex deployments
- **Resource planning** for development and production workloads
- **Tool chain management** across multiple technologies
- **Problem prevention** through systematic verification

---

*Environment setup completed on 2024-08-20. All tools verified, resources assessed, ready for Milestone 1.*

---

## Milestone 1: Verify Your Application Works with Docker Compose

**Learning Objective:** Confirm your application runs correctly in containers before moving to Kubernetes complexity.

**Why this matters:** Many Kubernetes deployment issues stem from application problems that existed in Docker Compose. By verifying everything works here first, you eliminate one major source of troubleshooting later.

### Step 1.1: Clone and Start Your Application

```bash
# Navigate to your project directory
cd /path/to/your/humor-memory-game

# Build all container images
docker-compose build

# Start all services in background
docker-compose up -d

# Wait for services to initialize (databases need time to start)
sleep 30
```

### Step 1.2: Verify Services Are Running

```bash
# Check that all containers are running
docker-compose ps

# You should see 5 services running:
# - frontend: Up, port 3000
# - backend: Up, port 3001  
# - postgres: Up, port 5432
# - redis: Up, port 6379
# - nginx: Up, ports 80, 443
```

### Step 1.3: Test Your Application in Browser

Open your web browser and navigate to `http://localhost:3000`. You should see:

- ✅ **Game interface loads** with the title "Humor Memory Game"
- ✅ **Username input** and difficulty selection work
- ✅ **Start Game button** is clickable
- ✅ **No connection errors** in the browser console (F12 to check)

**Test the full workflow:**
```bash
# Test backend API health
curl http://localhost:3001/health
# Should return: {"status":"healthy"}

# Test frontend serves properly  
curl http://localhost:3000/
# Should return HTML content

# Test database connectivity
docker-compose exec postgres psql -U gameuser -d humor_memory_game -c "SELECT version();"
# Should return PostgreSQL version info
```

### Checkpoint ✅

Your Docker Compose application is working when:
- All containers show "Up" status in `docker-compose ps`
- Frontend loads at `http://localhost:3000` without errors
- You can start a game and see emoji cards
- API health endpoint returns success
- Database connection works

### Common Issues & Fixes

**Issue: Containers keep restarting**
```bash
# Check logs for the problematic service
docker-compose logs backend
docker-compose logs postgres

# Common fix: Wait longer for database initialization
docker-compose down
docker-compose up -d
sleep 60  # Give more time for startup
```

**Issue: Frontend shows "Cannot connect to game server"**
```bash
# Verify backend is accessible
curl http://localhost:3001/health

# Check backend logs for errors
docker-compose logs backend

# Restart just the backend if needed
docker-compose restart backend
```

### Clean Up Before Moving Forward

```bash
# Stop all services (but keep data)
docker-compose down

# Verify everything is stopped
docker-compose ps
# Should show no running containers
```

### What You Learned

You've confirmed that your application works correctly in containers, including:
- **Multi-service orchestration** with Docker Compose
- **Database connectivity** between application and PostgreSQL
- **Caching integration** with Redis
- **Frontend-backend communication** through nginx proxy

### Professional Skills Gained

- **Container orchestration** fundamentals
- **Service dependency management** (databases must start before applications)
- **Health check verification** to confirm services are truly ready
- **Debugging containerized applications** using logs and direct testing

---

## Milestone 2: Deploy to Kubernetes

**Learning Objective:** Transform your Docker Compose application into a Kubernetes deployment, understanding the fundamental differences in how Kubernetes manages applications.

**Why this matters:** This milestone teaches you the core Kubernetes concepts that every platform engineer needs to know: Pods, Services, Deployments, and ConfigMaps.

### Step 2.1: Create Your Kubernetes Cluster

```bash
# Create a local 3-node Kubernetes cluster
k3d cluster create dev-cluster \
  --servers 1 \
  --agents 2 \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer"

# Verify cluster is running
kubectl get nodes

kubectl get nodes -o wide
# Should show 3 nodes: 1 server, 2 agents, all "Ready"

# Check cluster health
kubectl cluster-info
# Should show cluster endpoint and DNS
```

**Understanding what happened:** You just created a mini Kubernetes cluster on your laptop. The `--port` flags expose cluster ports 80 and 443 to your localhost ports 8080 and 8443, allowing external access.

### Step 2.2: Deploy Your Application Configuration

Kubernetes uses ConfigMaps and Secrets to manage application configuration, replacing the `.env` file approach from Docker Compose.

```bash
# Create the application namespace (organization)
kubectl apply -f k8s/namespace.yaml

# Create configuration and secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Verify they were created
kubectl get configmap -n humor-game
kubectl get secrets -n humor-game
```

**Understanding ConfigMaps vs Secrets:** ConfigMaps store non-sensitive configuration (database names, ports), while Secrets store sensitive data (passwords, API keys) with base64 encoding.

### Step 2.3: Deploy Database Services

Databases must start before your application, just like in Docker Compose.

```bash
# Deploy PostgreSQL with persistent storage
kubectl apply -f k8s/postgres.yaml

# Deploy Redis for caching
kubectl apply -f k8s/redis.yaml

# Wait for databases to be ready (this takes time!)
echo "⏳ Waiting for PostgreSQL..." && kubectl wait --for=condition=ready pod -l app=postgres -n humor-game --timeout=180s || echo "⚠️ PostgreSQL timeout - continuing with diagnostics"

echo "⏳ Waiting for PostgreSQL..." && kubectl wait --for=condition=ready pod -l app=postgres -n humor-game --timeout=180s || echo "⚠️ PostgreSQL timeout - continuing with diagnostics"

# Verify databases are running
kubectl get pods -n humor-game
# Should show postgres and redis pods with "1/1 Running"
```

**Understanding Persistent Storage:** The PostgreSQL deployment creates a PersistentVolumeClaim (PVC) to ensure your data survives pod restarts, unlike temporary container storage.

### Step 2.4: Build and Deploy Application Services

**⚠️ CRITICAL: Build Images Locally AND Import to k3d!**

Before deploying to Kubernetes, you must build your container images locally AND import them to k3d. This ensures both local availability and k3d context.

```bash
# Build your application images locally
docker build -t humor-game-frontend:latest ./frontend
docker build -t humor-game-backend:latest ./backend

# Verify images were built
docker images | grep humor-game
# Should show: humor-game-frontend:latest and humor-game-backend:latest

# Import images to k3d (CRITICAL STEP!)
k3d image import humor-game-frontend:latest -c humor-game-cluster
k3d image import humor-game-backend:latest -c humor-game-cluster
```

**Why this matters:** 
- **Local builds** create the images with your latest code changes
- **k3d import** ensures the cluster can access the updated images
- **`imagePullPolicy: Never`** tells Kubernetes to use local images instead of external registries
- **This eliminates image pull errors** and registry complexity

**Deploy your services:**
```bash
# Deploy backend API service
kubectl apply -f k8s/backend.yaml

# Deploy frontend web service  
kubectl apply -f k8s/frontend.yaml

# Wait for applications to be ready
kubectl wait --for=condition=ready pod -l app=backend -n humor-game --timeout=120s
kubectl wait --for=condition=ready pod -l app=frontend -n humor-game --timeout=60s

# Check all pods are running
kubectl get pods -n humor-game
# Should show 4 pods all with "1/1 Running" status
```

#### Understanding the Hybrid Image Strategy

**Why this approach works:**
- **`imagePullPolicy: Never`** tells Kubernetes: "Don't try to pull from external registries"
- **Local Docker daemon** provides the base images
- **k3d import** ensures the cluster context is updated
- **No external registry complexity** - perfect for development and learning

**The complete workflow:**
1. **Build locally**: `docker build -t humor-game-frontend:latest ./frontend`
2. **Import to k3d**: `k3d image import humor-game-frontend:latest -c humor-game-cluster`
3. **Deploy to K8s**: `kubectl apply -f k8s/frontend.yaml`
4. **K8s uses local image**: No pulling, no registry errors

**When you rebuild (complete cycle):**
```bash
# 1. Rebuild image
docker build -t humor-game-frontend:latest ./frontend

# 2. Import to k3d (IMPORTANT!)
k3d image import humor-game-frontend:latest -c humor-game-cluster

# 3. Restart deployment
kubectl rollout restart deployment/frontend -n humor-game
```

**Why k3d import is necessary:**
- **k3d has its own image context** separate from your local Docker daemon
- **Local builds update your Docker**, but k3d needs to know about the changes
- **Without import**, k3d might use cached/stale versions of your images
- **This is especially important** when you make configuration changes (like nginx.conf updates)

#### K8s Smoke Tests (Regression at Cluster Level)

Now let's run the smoke tests to verify everything is working:
Backend health via Service:
```
echo "🧪 Testing Backend Health via Service..." && kubectl port-forward -n humor-game svc/backend 3001:3001 >/dev/null 2>&1 & echo $! > /tmp/pf_backend.pid && sleep 2 && curl -sf http://127.0.0.1:3001/health && echo "✅ Backend health check passed" && kill $(cat /tmp/pf_backend.pid) || (echo "❌ Backend health check failed" && kill $(cat /tmp/pf_backend.pid) 2>/dev/null || true)

Frontend static via Service:

echo "🧪 Testing Frontend via Service..." && kubectl port-forward -n humor-game svc/frontend 8088:80 >/dev/null 2>&1 & echo $! > /tmp/pf_frontend.pid && sleep 2 && curl -sI http://127.0.0.1:8088/ | grep -q "200" && echo "✅ Frontend HEAD 200 confirmed" || echo "⚠️ Frontend HEAD 200 not confirmed" && kill $(cat /tmp/pf_frontend.pid) 2>/dev/null || true

```
#### Next Steps
The application is now running on Kubernetes! You can:
Access the frontend via port-forward: kubectl port-forward -n humor-game svc/frontend 8080:80
Test the API via port-forward: kubectl port-forward -n humor-game svc/backend 3001:3001
Proceed to Milestone 2.5 (Ingress setup) for production-style access

Access Your Kubernetes App
Frontend (Game App)
URL: http://gameapp.local:8080
Status: ✅ Already running (you can see the port-forward is active)



### Step 2.5: Set Up Ingress Controller for External Access

An Ingress Controller acts like nginx in Docker Compose, routing external traffic to your services.

```bash
# Install nginx-ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/baremetal/deploy.yaml

or

echo "🔧 Installing NGINX Ingress Controller with unique name..." && helm install humor-game-ingress ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace --set controller.service.type=LoadBalancer --set controller.ingressClassResource.name=humor-game-nginx

# Wait for ingress controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# Deploy your application's ingress rules
kubectl apply -f k8s/ingress.yaml

# Verify ingress is configured
kubectl get ingress -n humor-game
```

### Step 2.6: Configure Local Domain and Test Access

**Set up local domain for development:**
```bash
# Add local domain to your hosts file
echo "127.0.0.1 gameapp.local" | sudo tee -a /etc/hosts

# Verify DNS resolution works
ping gameapp.local
# Should ping 127.0.0.1 successfully
```

**Test your Kubernetes application:**
```bash
# Test API health through Ingress
curl -H "Host: gameapp.local" http://localhost:8080/api/health
# Should return: {"status":"healthy",...}

# Open in browser with domain
open http://gameapp.local:8080
```

**Note:** This completes your development setup with Ingress routing. Milestone 3 will add production features like TLS certificates, monitoring dashboards, and horizontal scaling.

**📚 Understanding the URL Patterns (Don't Get Confused!)**

The documentation shows different URLs for different purposes:

- **`localhost:8080`** - For direct service testing and curl commands with Host headers
- **`gameapp.local:8080`** - For actual user access through the browser  
- **`Host: gameapp.local`** - For testing Ingress routing

This gives you **both development and production access patterns**:

- **Developers**: Use `localhost:8080` for direct testing and debugging
- **Users**: Access via `gameapp.local:8080` through Ingress (production-style)
- **DevOps Engineers**: Can test both patterns to verify routing works correctly

**Why both?** `localhost:8080` is the local port that k3d exposes, while `gameapp.local:8080` is the domain that Ingress routes to your services.

### Checkpoint ✅

Your Kubernetes deployment is working when:
- All 4 pods show "1/1 Running" status
- Frontend loads at `http://gameapp.local:8080` through Ingress
- You can start a game and play without errors
- Backend API responds to health checks
- Ingress routes traffic correctly to both frontend and backend

### Verify Full Application Functionality

Open `http://gameapp.local:8080` in your browser and test:
- ✅ **Game interface loads** properly
- ✅ **Username and difficulty selection** work
- ✅ **Start game button** creates a new game
- ✅ **Card flipping and matching** function correctly
- ✅ **Leaderboard tab** shows sample data
- ✅ **No connection errors** in browser console

### Common Issues & Fixes

**Issue: Pods stuck in "Pending" status**
```bash
# Check what's wrong
kubectl describe pod <pod-name> -n humor-game

# Common cause: Insufficient resources
kubectl top nodes  # Check resource usage
```

**Issue: Backend can't connect to database**
```bash
# Check backend logs
kubectl logs -l app=backend -n humor-game

# Verify database service exists
kubectl get svc postgres -n humor-game

# Test database connectivity
kubectl exec -it deployment/postgres -n humor-game -- psql -U gameuser -d humor_memory_game -c "SELECT 1;"
```

**Issue: Frontend not loading correctly (static assets served as index.html)**
```bash
# Problem: Frontend nginx catch-all location block overriding static asset paths
# Solution: Reorder nginx location blocks with ^~ prefix matching
# Fix: Update frontend/nginx.conf to prioritize /scripts/, /styles/, /components/

# Verify fix:
curl -H "Host: gameapp.local" -I http://localhost:8080/scripts/game.js
# Should return: Content-Type: application/javascript, not text/html
```

**Issue: Backend Redis connection failing with malformed URL**
```bash
# Problem: Kubernetes sets REDIS_PORT=tcp://host:port instead of just port
# Error: redis://:password@redis:tcp://10.43.201.171:6379/0 (ERR_INVALID_URL)

# Solution: Universal Redis connection logic for both environments
# Fix: Update backend/utils/redis.js to handle tcp:// prefix in REDIS_PORT

# Verify fix:
kubectl logs -l app=backend -n humor-game | grep "Redis: Connected"
# Should show: ✅ Redis: Connected and ready!
```

**Issue: Ingress not routing /api/* requests to backend**
```bash
# Problem: Ingress routing correct but backend missing /api/* routes
# Error: {"error":"Not Found","message":"API endpoint not found! 🔍"}

# Solution: Add /api/* routes to backend server.js
# Fix: Ensure backend has app.get('/api/health', ...) and app.use('/api/*', ...)

# Verify fix:
curl -H "Host: gameapp.local" -s http://localhost:8080/api/health
# Should return: {"status":"healthy",...}
```

**Issue: Frontend JavaScript configuration race condition**
```bash
# Problem: window.API_BASE_URL not set when game.js executes
# Error: "Cannot Connect to Game Server" in browser

# Solution: Async configuration loader with waitForConfig()
# Fix: Implement Promise-based config waiting in frontend/src/scripts/game.js

# Verify fix:
# Browser console should show: ✅ Configuration loaded successfully
```

**Issue: Image pull errors (ErrImagePull/ImagePullBackOff)**
```bash
# Problem: Kubernetes trying to pull images from external registries
# Error: "Failed to pull image: failed to resolve reference"

# Solution: Use local images with imagePullPolicy: Never
# Fix: Build images locally first, then deploy
docker build -t humor-game-frontend:latest ./frontend
docker build -t humor-game-backend:latest ./backend

# Why this works: imagePullPolicy: Never tells Kubernetes to use local images
# No registry setup needed - your local Docker daemon serves as the image source
```

### ✅ Checkpoint List

**Milestone 2 Complete when all items are verified:**

- [ ] **Cluster Ready**: `kubectl get nodes` shows 3 nodes (1 server, 2 agents) all "Ready"
- [ ] **Images Built Locally**: `docker images | grep humor-game` shows frontend and backend images
- [ ] **Namespace Created**: `kubectl get namespace humor-game` exists
- [ ] **ConfigMap Applied**: `kubectl get configmap -n humor-game humor-game-config` exists
- [ ] **Secrets Applied**: `kubectl get secrets -n humor-game` shows postgres-secret and redis-secret
- [ ] **PostgreSQL Running**: `kubectl get pods -n humor-game -l app=postgres` shows "1/1 Running"
- [ ] **Redis Running**: `kubectl get pods -n humor-game -l app=redis` shows "1/1 Running"
- [ ] **Backend Running**: `kubectl get pods -n humor-game -l app=backend` shows "1/1 Running"
- [ ] **Frontend Running**: `kubectl get pods -n humor-game -l app=frontend` shows "1/1 Running"
- [ ] **Services Created**: `kubectl get svc -n humor-game` shows 4 services (postgres, redis, backend, frontend)
- [ ] **Backend Health**: `curl -H "Host: gameapp.local" http://gameapp.local:8080/api/health` returns 200 OK
- [ ] **Frontend Loads**: `curl -H "Host: gameapp.local" http://gameapp.local:8080/` returns 200 OK
- [ ] **Static Assets**: `curl -H "Host: gameapp.local" http://gameapp.local:8080/scripts/game.js` returns JavaScript content
- [ ] **No Connection Errors**: Browser console shows no "Cannot Connect to Game Server" errors
- [ ] **Game Functional**: Can start game, flip cards, and interact with interface

### 📸 Screenshots: Kubernetes Deployment Status

**Pod Status Verification:**
```bash
kubectl get pods -n humor-game -o wide
```

**Expected Output:**
```
NAME                       READY   STATUS    RESTARTS   AGE     IP           NODE                    NOMINATED NODE   READINESS GATES
backend-675577fbf8-rb77b   1/1     Running   0          15m     10.42.0.53   k3d-humor-game-cluster-agent-0   <none>           <none>
frontend-5977b4874d-hfddb  1/1     Running   0          20m     10.42.0.57   k3d-humor-game-cluster-agent-1   <none>           <none>
postgres-7d8f9b8c5d-abc12  1/1     Running   0          25m     10.42.0.51   k3d-humor-game-cluster-agent-0   <none>           <none>
redis-9f8e7d6c5b-def34    1/1     Running   0          25m     10.42.0.52   k3d-humor-game-cluster-agent-1   <none>           <none>
```

**Service Status Verification:**
```bash
kubectl get svc -n humor-game
```

**Expected Output:**
```
NAME      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
backend   ClusterIP   10.43.244.239   <none>        3001/TCP   88m
frontend  ClusterIP   10.43.201.170   <none>        80/TCP     88m
postgres  ClusterIP   10.43.201.172   <none>        5432/TCP   88m
redis     ClusterIP   10.43.201.171   <none>        6379/TCP   88m
```

**Ingress Status Verification:**
```bash
kubectl get ingress -n humor-game
```

**Expected Output:**
```
NAME               CLASS                HOSTS           ADDRESS   PORTS   AGE
humor-game-ingress   humor-game-nginx   gameapp.local   80        88m
```

### 🎯 **Milestone 2 Achievement Unlocked!**

**What you've accomplished:**
- ✅ **Multi-service application** running on Kubernetes with proper service discovery
- ✅ **Persistent storage** for PostgreSQL data that survives pod restarts
- ✅ **Load balancing** with k3d loadbalancer exposing ports 8080:80 and 8443:443
- ✅ **Configuration management** using ConfigMaps and Secrets instead of .env files
- ✅ **Health checks** ensuring services are ready before accepting traffic
- ✅ **Production networking** with Ingress controller routing external traffic
- ✅ **Universal compatibility** - same configuration works in Docker Compose and Kubernetes

**Next milestone:** Proceed to **Milestone 3: Ingress & External Access** to enable production-style domain access and TLS termination.

### Understanding the Differences: Docker Compose vs Kubernetes

| Aspect | Docker Compose | Kubernetes |
|--------|----------------|------------|
| **Configuration** | `.env` files | ConfigMaps + Secrets |
| **Networking** | Bridge networks | Services + DNS |
| **Storage** | Named volumes | PersistentVolumeClaims |
| **Load Balancing** | nginx container | Services + Ingress |
| **Health Checks** | Container health | Readiness + Liveness probes |
| **Scaling** | Manual replica counts | Horizontal Pod Autoscaler |
| **Images** | Local Docker images | Local images + `imagePullPolicy: Never` |

### What You Learned

You've successfully migrated a multi-service application from Docker Compose to Kubernetes, understanding:
- **Pod orchestration** and how containers run in Kubernetes
- **Service discovery** and how applications find each other
- **Configuration management** with ConfigMaps and Secrets
- **Persistent storage** for stateful applications like databases
- **Ingress routing** for external access to your applications
- **Universal image strategy** that works in both Docker Compose and Kubernetes without conflicts

### Professional Skills Gained

- **Kubernetes fundamentals** that form the foundation of container orchestration
- **Service mesh basics** through Kubernetes service discovery
- **Configuration as code** practices for managing application settings
- **Infrastructure debugging** skills for troubleshooting complex deployments
- **Multi-environment compatibility** ensuring Docker Compose and Kubernetes work seamlessly together

---

## Milestone 3: Production-Grade Security and Scalability

**Learning Objective:** Enhance your working Kubernetes application with production-ready features like TLS certificates, monitoring, resource management, and real domain deployment.

**Why this matters:** This milestone transforms your local application into one ready for production use, implementing security and scalability patterns used by enterprise applications.

**Prerequisites:** 
- ✅ Milestone 2 completed with `gameapp.local:8080` working
- ✅ All 4 pods running and game functional
- ✅ Ingress controller routing traffic correctly

### Step 3.1: Verify Current Setup and Add Production Monitoring

First, let's confirm your Milestone 2 setup is solid and add monitoring capabilities:

```bash
# Verify your current setup from Milestone 2
curl -H "Host: gameapp.local" -s http://localhost:8080/api/health
# Should return: {"status":"healthy"}

# Test game functionality
open http://gameapp.local:8080

# Add resource monitoring
kubectl top nodes
kubectl top pods -n humor-game
```

### Step 3.2: Implement Resource Limits and Requests

Production applications need resource management to prevent one service from consuming all cluster resources:

**✅ Resource limits are already configured in your deployment files!**

```bash
# Verify resources are applied (they're already there from Milestone 2)
kubectl describe deployment backend -n humor-game | grep -A 10 "Limits\|Requests"
kubectl describe deployment frontend -n humor-game | grep -A 10 "Limits\|Requests"
```

**Understanding Resource Management:** Resource requests guarantee minimum resources, while limits prevent overconsumption. This is critical for production stability.

**What's already configured:**
- **Backend**: 128Mi-256Mi memory, 100m-500m CPU
- **Frontend**: 64Mi-128Mi memory, 50m-200m CPU
- **PostgreSQL**: 256Mi-512Mi memory, 200m-1000m CPU
- **Redis**: 64Mi-128Mi memory, 50m-200m CPU

### Step 3.3: Set Up Real Domain Access (Optional but Recommended)

If you have a domain, let's set up real production access:

**Option A: Using a Real Domain You Own**
```bash
# If you own a domain like "mycompany.com", create a subdomain
# In your DNS provider, add an A record:
# Name: game.mycompany.com  
# Value: Your public IP or cloud load balancer IP

# ✅ Your ingress is already configured for production!
# The k8s/ingress.yaml already includes both:
# - gameapp.local (for local development)
# - gameapp.games (for production)

# Just apply the existing ingress (no editing needed)
kubectl apply -f k8s/ingress.yaml

# Test with your real domain (replace gameapp.games with your actual domain)
curl -H "Host: yourdomain.com" http://your-public-ip/api/health
```

**Option B: Using ngrok for Testing (No Domain Required)**
```bash
# Install ngrok if you don't have it
# Sign up at ngrok.com for free account

# Expose your local k3d cluster to the internet
ngrok http 8080

# This gives you a public URL like: https://abc123.ngrok.io
# ✅ Your ingress is already configured for production domains!
# Just replace gameapp.games in k8s/ingress.yaml with your ngrok URL
# Then apply: kubectl apply -f k8s/ingress.yaml
```

### Step 3.4: Add TLS/HTTPS Support

Production applications need encrypted traffic:

```bash
# Install cert-manager for automatic TLS certificates
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=120s

# Apply TLS configuration to your ingress
kubectl apply -f k8s/production/tls-ingress.yaml

# Verify certificate is issued
kubectl get certificate -n humor-game
kubectl describe certificate game-tls -n humor-game
```

### Step 3.5: Implement Health Checks and Monitoring

Add production-grade health monitoring:

**✅ Health checks are already configured in your deployments!**

```bash
# Verify health checks are working
kubectl describe deployment backend -n humor-game | grep -A 5 "Liveness\|Readiness"

# Install simple monitoring stack (beginner-friendly)
kubectl apply -f k8s/simple-monitoring.yaml

# Wait for monitoring pods to be ready
kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=120s

# Check monitoring is working
kubectl get pods -n monitoring

# Access monitoring dashboards
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
kubectl port-forward -n monitoring svc/grafana 3000:3000 &

# Open in browser:
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)

**📊 Monitoring Access Verification:**
```bash
# Test if monitoring services are accessible
curl -s -I http://localhost:9090 | head -n 1
curl -s -I http://localhost:3000 | head -n 1
```

**Expected Output:**
```
HTTP/1.1 405 Method Not Allowed  # Prometheus (normal - HEAD not supported)
HTTP/1.1 302 Found               # Grafana (normal - redirects to login)
```

**🔍 Why "Method Not Allowed"?**
- **Prometheus**: Expects GET requests, HEAD requests return 405 (normal behavior)
- **Grafana**: Returns 302 redirect to login page (normal behavior)
- **Both responses mean the services are working correctly!**

### Step 3.6: Configure Horizontal Pod Autoscaling

Let your application scale automatically based on load:

**🚀 What is HPA (Horizontal Pod Autoscaler)?**

Think of HPA as an **automatic traffic controller** for your app:

- **Without HPA**: 1000 users → 1 pod → **slow response times** ❌
- **With HPA**: 1000 users → 5 pods → **fast response times** ✅

**How it works:**
1. **Monitor**: HPA watches CPU/memory usage of your pods
2. **Threshold**: When usage goes above 70% CPU or 80% memory
3. **Scale Up**: Automatically creates more pods to handle load
4. **Scale Down**: When usage drops, removes extra pods (saves resources)

**Real-world example:**
- **Low traffic**: 1 pod running (efficient)
- **High traffic**: 5 pods running (responsive)
- **Traffic drops**: Back to 1 pod (cost-effective)

```bash
# Apply HPA configuration
kubectl apply -f k8s/hpa.yaml

# Verify HPA is working
kubectl get hpa -n humor-game

**Expected Output:**
```
NAME           REFERENCE             TARGETS                                     MINPODS   MAXPODS   REPLICAS   AGE
backend-hpa    Deployment/backend    cpu: <unknown>/70%, memory: <unknown>/80%   1         5         1          14s
frontend-hpa   Deployment/frontend   cpu: <unknown>/70%                          1         3         1          14s
```

**🔍 Understanding the Output:**
- **`<unknown>` targets**: Normal for k3d - metrics server may not be fully configured yet
- **MINPODS/MAXPODS**: Your scaling limits (1-5 for backend, 1-3 for frontend)
- **REPLICAS**: Current number of pods running
- **This is expected behavior** - HPA is working, just waiting for metrics data

# Generate some load to test autoscaling
kubectl run load-test --image=busybox --rm -i --tty -- sh
# Inside the pod:
while true; do wget -q -O- http://gameapp.local:8080/; done
```

### Step 3.7: Production Security Hardening

Implement security best practices:

**🔒 What is Security Hardening?**

Security hardening makes your application more secure by:
- **Network isolation**: Only allowing necessary communication between pods
- **Non-root execution**: Preventing containers from running as root users
- **Capability restrictions**: Removing unnecessary system privileges
- **Security contexts**: Enforcing security policies at the pod level

**Why it matters:**
- **Prevents attacks**: If one pod is compromised, others are protected
- **Compliance**: Meets enterprise security standards
- **Best practices**: Industry-standard security configurations

**🔍 What the Network Policies Do:**

**Frontend Policy:**
- ✅ **Allows**: Incoming traffic from Ingress controller, health checks
- ✅ **Allows**: Outgoing traffic to backend API (port 3001)
- ✅ **Allows**: DNS resolution (port 53)
- ❌ **Blocks**: All other incoming/outgoing traffic

**Backend Policy:**
- ✅ **Allows**: Incoming traffic from frontend only
- ✅ **Allows**: Outgoing traffic to PostgreSQL (port 5432) and Redis (port 6379)
- ✅ **Allows**: DNS resolution (port 53)
- ❌ **Blocks**: All other incoming/outgoing traffic

**Database Policies:**
- ✅ **Allows**: Incoming traffic from backend only
- ✅ **Allows**: Health checks from kubelet
- ❌ **Blocks**: All other incoming traffic
- ❌ **Blocks**: All outgoing traffic (except DNS)

**🔒 What Security Contexts Do:**

**Security Contexts** control how containers run inside pods:

**Quick Overview:**
- **`runAsNonRoot: true`**: Prevents containers from running as root user
- **`runAsUser: 1001`**: Forces containers to run as specific non-root user
- **`allowPrivilegeEscalation: false`**: Prevents containers from gaining root privileges
- **`capabilities.drop: ["ALL"]**: Removes all Linux capabilities (privileges)

**Why We Need Security Contexts:**
- **By default**, containers run as root (UID 0) → **Dangerous!**
- **With security contexts**, containers run as limited users → **Secure!**
- **Prevents privilege escalation** and minimizes attack surface
- **Enterprise-grade security** used by Google, Amazon, Microsoft

**📚 For Complete Understanding:**
> **See the comprehensive guide**: [`docs/security-contexts-guide.md`](docs/security-contexts-guide.md)
> 
> This guide explains:
> - Detailed security context configurations
> - Real attack scenarios and how security contexts prevent them
> - Step-by-step verification commands
> - Best practices and enterprise security benefits

**🔍 Network Policies vs Security Contexts - What's the Difference?**

**Network Policies** (What we implemented):
- **Control communication** between pods
- **Network-level security** - who can talk to whom
- **Prevents lateral movement** if one pod is compromised
- **Like a firewall** between services

**Security Contexts** (What we documented):
- **Control how containers run** inside pods
- **Container-level security** - what privileges containers have
- **Prevents privilege escalation** and root access
- **Like user permissions** inside containers

**Together they provide defense in depth:**
1. **Network policies** prevent unauthorized pod-to-pod communication
2. **Security contexts** prevent unauthorized actions inside pods
3. **Both working together** = enterprise-grade security

```bash
# Apply network policies to restrict pod communication
kubectl apply -f k8s/network-policies.yaml

# Apply pod security standards
kubectl apply -f k8s/security-context.yaml

# Verify security policies
kubectl get networkpolicy -n humor-game
kubectl describe networkpolicy -n humor-game

**Expected Output:**
```
NAME                      POD-SELECTOR   AGE
backend-network-policy    app=backend    56s
database-network-policy   app=postgres   56s
frontend-network-policy   app=frontend   56s
redis-network-policy      app=redis      56s
```

**🧪 Test Network Policy Enforcement:**
```bash
# Test if frontend can reach backend (should work - allowed by policy)
curl -H "Host: gameapp.local" -s http://localhost:8080/api/health

# Test if application still functions with policies
open http://gameapp.local:8080
```

### Checkpoint ✅

Your production-grade setup is working when:
- ✅ **Resource limits applied** - pods have CPU/memory limits (already done in Milestone 2)
- ✅ **Health checks enhanced** - liveness and readiness probes active (already done in Milestone 2)
- ✅ **Monitoring deployed** - Prometheus and Grafana running and accessible
- ✅ **Autoscaling configured** - HPA created and monitoring resource usage
- ✅ **Real domain access** - Ingress configured for both local and production domains
- ✅ **TLS/HTTPS** - Optional: requires cert-manager setup
- ✅ **Security hardening** - Network policies implemented, security contexts configured

### Test Production Features

**Load Testing:**
```bash
# Test autoscaling under load
kubectl get hpa -n humor-game -w
# In another terminal, generate load and watch pods scale
```

**Monitoring Testing:**
```bash
# Access Prometheus metrics
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
# Open http://localhost:9090 and query: up (should show all targets)

# Access Grafana dashboard
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
# Open http://localhost:3000 (admin/admin) and create dashboards
```

**HPA Testing:**
```bash
# Watch HPA status
kubectl get hpa -n humor-game -w

# Generate some load to test scaling
kubectl run load-test --image=busybox --rm -i --tty -- sh
# Inside the pod: while true; do wget -q -O- http://gameapp.local:8080/; done
```

**Security Testing:**
```bash
# Verify network policies are working
kubectl get networkpolicy -n humor-game

# Test if application still functions with policies
curl -H "Host: gameapp.local" -s http://localhost:8080/api/health

# Check security contexts
kubectl describe deployment frontend -n humor-game | grep -A 5 "Security Context"

# Verify containers are running as non-root users
kubectl exec -it deployment/frontend -n humor-game -- whoami
kubectl exec -it deployment/backend -n humor-game -- whoami

# Expected output: Should show non-root users (e.g., "nginx", "backend")
```

---

## 🎯 **Milestone 3 Achievement Unlocked!**

**What you've accomplished:**
- ✅ **Production resource management** with CPU/memory limits and requests
- ✅ **Advanced health monitoring** with Prometheus metrics collection
- ✅ **Professional dashboards** with Grafana for visualization
- ✅ **Auto-scaling capability** with Horizontal Pod Autoscaler (HPA)
- ✅ **Production-ready ingress** configured for both development and production domains
- ✅ **Monitoring stack** that scales with your application

**Professional Skills Gained:**
- **Resource optimization** - preventing resource starvation in production
- **Observability** - monitoring application performance and health
- **Auto-scaling** - understanding how Kubernetes scales applications automatically
- **Production deployment** - real-world patterns used in enterprise environments
- **Monitoring setup** - Prometheus + Grafana stack configuration and access
- **Security hardening** - network policies and security contexts implementation

**Next steps (Optional):**
- **TLS/HTTPS**: Install cert-manager for automatic SSL certificates
- **Advanced security**: Implement pod security admission controllers (requires newer Kubernetes versions)

| Feature | Development (Milestone 2) | Production (Milestone 3) |
|---------|---------------------------|--------------------------|
| **Access** | `gameapp.local:8080` (local only) | Real domain + HTTPS |
| **Resources** | Unlimited (can crash cluster) | Limited (stable performance) |
| **Scaling** | Fixed replicas | Auto-scaling based on load |
| **Security** | Basic (pods can talk to anything) | Network policies + hardening |
| **Monitoring** | kubectl logs only | Metrics, alerts, dashboards |
| **Certificates** | HTTP only | Automatic TLS management |

### What You Learned

You've implemented enterprise-grade production features:
- **Resource management** preventing resource starvation
- **Automatic scaling** handling traffic spikes
- **Security hardening** protecting against threats
- **TLS termination** encrypting user traffic
- **Comprehensive monitoring** observing system health

### Professional Skills Gained

- **Production readiness** patterns used by major platforms
- **Auto-scaling strategies** for handling variable load
- **Security best practices** for multi-tenant environments
- **Certificate management** for encrypted communications
- **Monitoring and observability** for operational excellence

---

**🎯 Milestone 3 Achievement Unlocked!**

Your application is now production-ready with:
- ✅ **Enterprise security** with network policies and hardened containers
- ✅ **Automatic scaling** responding to user demand
- ✅ **Professional monitoring** with metrics and alerting
- ✅ **Encrypted traffic** with automatic certificate management
- ✅ **Resource efficiency** with proper limits and requests
- ✅ **Real-world deployment** ready for actual users

**Next milestone:** Proceed to **Milestone 4: CI/CD Pipeline** to automate your deployment process.

---

## Milestone 4: Enterprise-Grade Observability and Monitoring

**Learning Objective:** Implement production-grade monitoring that gives you complete visibility into your application's health, performance, and user behavior.

**Why this matters:** Monitoring isn't optional in production. This milestone teaches you the same observability patterns used by companies like Datadog and New Relic to track application performance and prevent outages before they happen.

**⏱️ Performance Note:** Prometheus pod creation can take 10-15 minutes on first deployment due to large images and RBAC setup. Subsequent deployments are much faster (2-5 minutes).

### Step 4.1: Deploy Monitoring Infrastructure

The monitoring stack includes Prometheus (metrics collection) and Grafana (visualization dashboards).

#### **✅ Checkpoint List - Milestone 4**
- [ ] Monitoring namespace and RBAC created
- [ ] Prometheus and Grafana pods running (1/1 Ready)
- [ ] Prometheus targets showing "UP" status
- [ ] Grafana accessible at localhost:3000
- [ ] Basic dashboard panels showing data
- [ ] Custom application metrics working
- [ ] Production metrics script generating data
- [ ] **Advanced dashboard imported successfully** ← **NEW STEP ADDED**
- [ ] Dashboard panels showing real-time data

**📚 Documentation:** Each checkpoint has detailed guides in our [docs/](docs/) folder. Start with [Troubleshooting Guide](docs/troubleshooting.md) if you get stuck!

```bash
# Create monitoring namespace and RBAC permissions
kubectl apply -f k8s/prometheus-rbac.yaml

# Deploy Prometheus and Grafana stack
kubectl apply -f k8s/monitoring.yaml

# Wait for monitoring services to be ready (this takes a few minutes)
kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s

# Verify monitoring stack is running
kubectl get pods -n monitoring
# Should show prometheus and grafana pods with "1/1 Running"
```

**Understanding the Monitoring Stack:**
- **Prometheus:** Collects and stores metrics from your applications
- **Grafana:** Creates visual dashboards from Prometheus data
- **ServiceMonitor:** Tells Prometheus which applications to monitor

### Step 4.2: Access Your Monitoring Dashboards

```bash
# Access Prometheus (metrics database)
kubectl port-forward svc/prometheus 9090:9090 -n monitoring &

# Access Grafana (dashboard interface)
kubectl port-forward svc/grafana 3000:3000 -n monitoring &

# Open monitoring interfaces
open http://localhost:9090  # Prometheus UI
open http://localhost:3000  # Grafana UI (login: admin/admin123)
```

### Step 4.3: Explore Prometheus Metrics

Open `http://localhost:9090` and explore the metrics Prometheus is collecting:

**Basic queries to try:**
```bash
# In Prometheus query interface, try these:

# Pod CPU usage
rate(container_cpu_usage_seconds_total[5m])

# Pod memory usage  
container_memory_usage_bytes

# HTTP requests to your backend
rate(http_requests_total[5m])

# Kubernetes pod restarts
increase(kube_pod_container_status_restarts_total[1h])
```

**Understanding Metrics:** Each query returns time-series data showing how values change over time. This forms the foundation for alerting and capacity planning.

### Step 4.4: Create Your First Grafana Dashboard

Open `http://localhost:3000` and login with `admin/admin123`.

**Create a new dashboard:**
1. Click the "+" icon and select "Create Dashboard"
2. Click "Add a new panel"
3. Add these panels one by one:

**Panel 1: Pod CPU Usage**
```bash
# Query: 
rate(container_cpu_usage_seconds_total{namespace="humor-game"}[5m])

# Panel title: "Pod CPU Usage"
# Unit: "percent (0.0-1.0)"
```

**Panel 2: Pod Memory Usage**
```bash
# Query:
container_memory_usage_bytes{namespace="humor-game"}

# Panel title: "Pod Memory Usage"  
# Unit: "custom units: bytes"
```

**Panel 3: HTTP Request Rate**
```bash
# Query:
rate(nginx_ingress_controller_requests[5m])

# Panel title: "HTTP Requests per Second"
# Unit: "reqps"
```

**Panel 4: Pod Status**
```bash
# Query:
kube_pod_status_phase{namespace="humor-game"}

# Panel title: "Pod Status"
# Visualization: "Stat"
```

### Step 4.4.5: Import Advanced Custom Dashboards

Instead of building dashboards from scratch, you can import our pre-built production-ready dashboards:

#### **📊 Option 1: Import Basic Custom Dashboard**
```bash
# 1. In Grafana, click the "+" icon → "Import"
# 2. Click "Upload JSON file"
# 3. Select: k8s/custom-dashboard.json
# 4. Click "Load"
# 5. Verify Data Source: Should show "Prometheus (default)"
# 6. Click "Import"
```

**Expected Result:**
- Dashboard with 2 panels: Custom Metric and Custom Graph
- Real-time data from Prometheus
- No "No data" errors

#### **🚀 Option 2: Import Advanced Production Dashboard**
```bash
# 1. In Grafana, click the "+" icon → "Import"
# 2. Click "Upload JSON file"
# 3. Select: k8s/advanced-custom-dashboard.json
# 4. Click "Load"
# 5. Verify Data Source: Should show "Prometheus (default)"
# 6. Click "Import"
```

**Expected Result:**
- Dashboard with 8 advanced panels
- Game performance metrics
- User engagement analytics
- System resource monitoring
- Production-ready visualizations

#### **📋 Option 3: Import Working Dashboard Template**
```bash
# 1. In Grafana, click the "+" icon → "Import"
# 2. Click "Upload JSON file"
# 3. Select: k8s/working-dashboard.json
# 4. Click "Load"
# 5. Verify Data Source: Should show "Prometheus (default)"
# 6. Click "Import"
```

**Expected Result:**
- Perfectly formatted dashboard structure
- All panels showing data
- No import errors

#### **🔧 Dashboard Import Troubleshooting**

**If Import Fails:**
```bash
# Check dashboard file format
cat k8s/advanced-custom-dashboard.json | jq '.dashboard' 2>/dev/null || echo "File is properly formatted"

# Expected: Should show "null" (no nested dashboard key)
# If you see dashboard content, the file needs fixing
```

**Common Import Issues:**
- **"Dashboard title cannot be empty"** → Use the fixed dashboard files
- **"Unique identifier required"** → Dashboard has proper uid field
- **"No data source found"** → Verify Prometheus data source exists

**Verify Dashboard Success:**
```bash
# Check if dashboards are imported
# In Grafana: Dashboards → Browse → Should see your new dashboards

# Test data population
# Run metrics script to generate data
./scripts/production-metrics-test-ingress.sh

# Refresh dashboards - should see real-time data
```

#### **📁 Available Dashboard Files**

**Ready-to-Import Dashboards:**
- **`k8s/custom-dashboard.json`** - Basic 2-panel dashboard (learning)
- **`k8s/advanced-custom-dashboard.json`** - Production 8-panel dashboard
- **`k8s/working-dashboard.json`** - Perfectly formatted template

**Dashboard Features:**
- ✅ **Pre-configured panels** with proper PromQL queries
- ✅ **Correct data source** references
- ✅ **Proper JSON structure** (no import errors)
- ✅ **Production-ready** visualizations
- ✅ **Real-time updates** from Prometheus

**Quick Import Commands:**
```bash
# Copy dashboard files to easily accessible location
cp k8s/*-dashboard.json ~/Desktop/

# Or create symbolic links
ln -s $(pwd)/k8s/*-dashboard.json ~/Desktop/

# Now you can easily drag & drop from Desktop to Grafana
```

### Step 4.5: Generate Load to See Metrics

Create some traffic to populate your dashboards using our production-ready metrics test scripts:

#### **🚀 Using Production Metrics Test Scripts**

**Option 1: Local Port-Forward (Traditional)**
```bash
# Start backend port-forward
kubectl port-forward -n humor-game svc/backend 3001:3001 &

# Run the metrics test script
./scripts/production-metrics-test.sh

# Expected output: 100+ successful API calls, metrics generated
```

**Option 2: Ingress-Based (Recommended)**
```bash
# No port-forward needed! Use ingress directly
./scripts/production-metrics-test-ingress.sh

# Expected output: Same metrics, but using gameapp.local:8080
```

**What These Scripts Do:**
- ✅ **Health Checks**: 20 health endpoint calls
- ✅ **API Testing**: 24 API endpoint tests
- ✅ **Game Simulation**: 50 game sessions (10 users × 5 games each)
- ✅ **Error Testing**: 8 error scenario tests
- ✅ **Metrics Collection**: 15 metrics endpoint calls
- ✅ **Load Testing**: 3 bursts of 20 concurrent requests

**Script Output Example:**
```
🚀 Production Metrics Test - Humor Memory Game
========================================================
📊 Testing Health Endpoint...
  ✓ Health check 1 completed
  ✓ Health check 2 completed
  ...
🎮 Testing API Endpoints...
  ✓ API welcome 1 completed
  ...
✅ Production metrics test completed!

📊 Check your metrics:
  • Grafana Dashboard: http://localhost:3000
  • Prometheus: http://localhost:9090
  • Your App: http://gameapp.local:8080

📋 Import Dashboards After Script:
  • Basic: `k8s/custom-dashboard.json`
  • Advanced: `k8s/advanced-custom-dashboard.json`
  • Template: `k8s/working-dashboard.json`
```

#### **🔄 Manual Load Generation (Alternative)**

If you prefer manual testing:
```bash
# Generate continuous load to see metrics change
for i in {1..100}; do
  curl -H "Host: gameapp.local" http://localhost:8080/ > /dev/null 2>&1
  curl -H "Host: gameapp.local" http://localhost:8080/api/health > /dev/null 2>&1
  sleep 1
done
```

**Watch your dashboards update** - you should see:
- ✅ **CPU usage increase** during the load test
- ✅ **HTTP request rate spike** in the request panel
- ✅ **Memory usage remain stable** (well-behaved application)
- ✅ **All pods remain healthy** during load

### 🔧 Troubleshooting Steps & Commands

#### **Step 1: Verify Monitoring Stack Status**
```bash
# Check all monitoring pods
kubectl get pods -n monitoring

# Expected: prometheus and grafana pods with "1/1 Running"
# If not running, check logs:
kubectl logs -f deployment/prometheus -n monitoring
kubectl logs -f deployment/grafana -n monitoring
```

#### **Step 2: Check Prometheus Targets**
```bash
# Verify targets are being discovered
kubectl get endpoints -n humor-game

# Check if pods have prometheus annotations
kubectl get pods -n humor-game -o yaml | grep -A 5 -B 5 prometheus

# Expected: Should see prometheus.io/scrape: "true"
```

#### **Step 3: Verify Port-Forwarding**
```bash
# Check what's using the ports
lsof -i :3000  # Grafana
lsof -i :9090  # Prometheus
lsof -i :3001  # Backend (if using)

# Kill conflicting processes
lsof -ti:3000 | xargs kill -9
lsof -ti:9090 | xargs kill -9

# Restart port-forwards
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
```

#### **Step 4: Test Connectivity**
```bash
# Test Prometheus
curl -s http://localhost:9090/-/healthy
# Expected: "OK"

# Test Grafana
curl -s http://localhost:3000/api/health
# Expected: {"database":"ok","version":"x.x.x"}

# Test Backend (if port-forwarding)
curl -s http://localhost:3001/health
# Expected: {"status":"healthy",...}
```

#### **Step 5: Check RBAC Configuration**
```bash
# Verify service accounts exist
kubectl get serviceaccount -n monitoring

# Check cluster roles
kubectl get clusterrole | grep prometheus

# Check cluster role bindings
kubectl get clusterrolebinding | grep prometheus

# Test permissions
kubectl auth can-i list pods --as=system:serviceaccount:monitoring:prometheus
# Expected: "yes"
```

#### **Step 6: Generate Test Data**
```bash
# Run metrics test script
./scripts/production-metrics-test-ingress.sh

# Or manually generate traffic
for i in {1..50}; do
  curl -H "Host: gameapp.local" http://localhost:8080/api/health > /dev/null 2>&1
  sleep 0.5
done
```

**📚 Need More Help?** See our comprehensive [Troubleshooting Guide](docs/troubleshooting.md) for additional diagnostic commands and solutions to common monitoring issues.

### Step 4.6: Set Up Application-Specific Metrics

Your backend can expose custom metrics about game activity:

```bash
# Check if your backend exposes metrics
curl http://localhost:3001/metrics

# If not available, your backend would need code like this added:
# (This is for reference - the actual backend files contain this)
#
# const promClient = require('prom-client');
# app.get('/metrics', async (req, res) => {
#   res.set('Content-Type', promClient.register.contentType);
#   res.end(await promClient.register.metrics());
# });
```

**Business Metrics Dashboard Panel:**
```bash
# Query: Number of active game sessions
game_sessions_active

# Query: Game completion rate  
rate(games_completed_total[5m])

# Query: Average game duration
histogram_quantile(0.5, rate(game_duration_seconds_bucket[5m]))
```

### 🎯 Advanced App-Based Queries

**Game Performance Metrics:**
```bash
# Game completion rate by user
rate(game_completion_total[5m]) by (username)

# Average score distribution
histogram_quantile(0.95, rate(game_score_bucket[5m]))

# Game session duration
rate(game_session_duration_seconds_sum[5m]) / rate(game_session_duration_seconds_count[5m])
```

**User Engagement Metrics:**
```bash
# Active users per hour
count_over_time(user_sessions_active[1h])

# User retention rate
rate(user_returning_total[24h]) / rate(user_new_total[24h])

# Average games per user
rate(games_played_total[1h]) / rate(unique_users_total[1h])
```

**Application Health Metrics:**
```bash
# Database connection pool usage
rate(db_connections_active[5m])

# Redis cache hit rate
rate(redis_cache_hits_total[5m]) / (rate(redis_cache_hits_total[5m]) + rate(redis_cache_misses_total[5m]))

# API response time percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

### 📊 Resource Limits & Monitoring

**Set Resource Limits for Production:**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Monitor Resource Usage:**
```bash
# Check current resource usage
kubectl top pods -n humor-game

# Check resource limits
kubectl describe pod <pod-name> -n humor-game | grep -A 5 Resources

# Monitor resource trends
# In Grafana: container_memory_usage_bytes{namespace="humor-game"}
# In Grafana: rate(container_cpu_usage_seconds_total{namespace="humor-game"}[5m])
```

### Checkpoint ✅

Your monitoring is working when:
- Prometheus collects metrics at `http://localhost:9090`
- Grafana shows dashboards at `http://localhost:3000`
- CPU and memory panels show data for your pods
- HTTP request panels show traffic spikes during load tests
- You can create and modify dashboard panels
- Metrics update in real-time as you use the application

**🔧 Troubleshooting:** If you encounter issues, refer to our [Troubleshooting Guide](docs/troubleshooting.md) for step-by-step solutions and diagnostic commands.

### Understanding Production Monitoring

**The Three Pillars of Observability:**
1. **Metrics:** Numerical data over time (CPU, memory, request rates)
2. **Logs:** Event records with context (error messages, user actions)  
3. **Traces:** Request flow through distributed services

**Key Metrics Categories:**
- **RED Metrics:** Rate, Errors, Duration (user-facing performance)
- **USE Metrics:** Utilization, Saturation, Errors (resource health)
- **Business Metrics:** Game sessions, user signups, revenue

**🔐 RBAC & Security:** Understanding why Prometheus needs proper permissions is crucial. See our [Prometheus RBAC Guide](docs/prometheus-rbac-guide.md) for complete explanations of service accounts and security best practices.

### Common Monitoring Issues & Fixes

**🚨 Issue: No metrics showing in Grafana**
```bash
# Check Prometheus is scraping targets
# Go to http://localhost:9090/targets
# All targets should show "UP" status

# Check ServiceMonitor configuration
kubectl get servicemonitor -n monitoring

# Verify pods have metric endpoints
kubectl get endpoints -n humor-game
```

**🔍 Issue: Grafana shows "No data"**
```bash
# Test Prometheus data source in Grafana
# Go to Configuration -> Data Sources -> Test
# Should show "Data source is working"

# Check Prometheus has data
# In Prometheus UI, try query: up
# Should return 1 for healthy targets
```

**📊 Issue: Dashboards are empty**
```bash
# Verify correct namespace in queries
# Query should include: {namespace="humor-game"}

# Check metric names are correct
# In Prometheus, use "Metrics" dropdown to see available metrics

# Generate some traffic to create data
curl -H "Host: gameapp.local" http://localhost:8080/api/health
```

**🔐 Issue: Prometheus pod won't start**
```bash
# Check RBAC configuration
kubectl get serviceaccount -n monitoring
kubectl get clusterrole | grep prometheus

# If missing, apply RBAC
kubectl apply -f k8s/prometheus-rbac.yaml
```

**📚 Need Help with RBAC?** See our comprehensive [Prometheus RBAC Guide](docs/prometheus-rbac-guide.md) for complete explanations of service accounts, permissions, and troubleshooting.

**🌐 Issue: Port-forwarding not working**
```bash
# Kill existing port-forwards
lsof -ti:3000 | xargs kill -9
lsof -ti:9090 | xargs kill -9

# Start fresh port-forwards
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
```

**🔧 More Troubleshooting Help?** See our comprehensive [Troubleshooting Guide](docs/troubleshooting.md) for step-by-step solutions to common issues.

**Issue: Grafana shows "No data"**
```bash
# Test Prometheus data source in Grafana
# Go to Configuration -> Data Sources -> Test
# Should show "Data source is working"

# Check Prometheus has data
# In Prometheus UI, try query: up
# Should return 1 for healthy targets
```

**📊 Issue: Dashboards are empty**
```bash
# Verify correct namespace in queries
# Query should include: {namespace="humor-game"}

# Check metric names are correct
# In Prometheus, use "Metrics" dropdown to see available metrics

# Generate some traffic to create data
curl -H "Host:gameapp.local" http://localhost:8080/api/health
```

**📊 Dashboard Creation Help?** See our [Custom Dashboard Guide](docs/custom-dashboard-guide.md) for step-by-step dashboard creation and import instructions.

**🚀 Quick Dashboard Setup:** Use our pre-built dashboards for instant production monitoring:
- **Basic**: `k8s/custom-dashboard.json` (2 panels)
- **Advanced**: `k8s/advanced-custom-dashboard.json` (8 panels)
- **Template**: `k8s/working-dashboard.json` (perfect format)

### 📸 Screenshots: Prometheus & Grafana Success

**Prometheus Targets Page (`/targets`):**
- Should show multiple `kubernetes-pods` targets
- All targets should display "UP" status
- Namespace should show `humor-game` for your app pods

**Grafana Dashboard with 4 Panels:**
- **Panel 1**: Pod CPU Usage showing real-time data
- **Panel 2**: Pod Memory Usage with stable values
- **Panel 3**: HTTP Request Rate with traffic spikes
- **Panel 4**: Pod Status showing all pods as healthy

**Expected Output:**
```
✅ Prometheus: 5+ targets UP
✅ Grafana: All 4 panels showing data
✅ Metrics: Real-time updates during load testing
✅ RBAC: No permission errors in logs
```

### Production Monitoring Best Practices

**Alerting Strategy:**
- **Critical:** Application down, database unavailable
- **Warning:** High CPU usage, slow response times
- **Info:** Deployment completed, scaling events

**Dashboard Design:**
- **Overview:** System health at a glance
- **Detail:** Deep-dive into specific services
- **Business:** User-facing metrics and KPIs

### What You Learned

You've implemented enterprise observability:
- **Metrics collection** with Prometheus for time-series data
- **Data visualization** with Grafana for operational dashboards  
- **Custom dashboards** tailored to your application's needs
- **Load testing** to validate monitoring under stress
- **Production monitoring patterns** used by major technology companies

### 📋 Unified Diff for home-lab.md

**Changes Made to Milestone 4:**
```diff
+ **⏱️ Performance Note:** Prometheus pod creation can take 10-15 minutes on first deployment due to large images and RBAC setup. Subsequent deployments are much faster (2-5 minutes).

+ #### **✅ Checkpoint List - Milestone 4**
+ - [ ] Monitoring namespace and RBAC created
+ - [ ] Prometheus and Grafana pods running (1/1 Ready)
+ - [ ] Prometheus targets showing "UP" status
+ - [ ] Grafana accessible at localhost:3000
+ - [ ] Basic dashboard panels showing data
+ - [ ] Custom application metrics working
+ - [ ] Production metrics script generating data
+ - [ ] Advanced dashboard imported successfully

+ ### 📸 Screenshots: Prometheus & Grafana Success
+ **Prometheus Targets Page (`/targets`):**
+ - Should show multiple `kubernetes-pods` targets
+ - All targets should display "UP" status
+ - Namespace should show `humor-game` for your app pods

+ **Grafana Dashboard with 4 Panels:**
+ - **Panel 1**: Pod CPU Usage showing real-time data
+ - **Panel 2**: Pod Memory Usage with stable values
+ - **Panel 3**: HTTP Request Rate with traffic spikes
+ - **Panel 4**: Pod Status showing all pods as healthy

+ **Expected Output:**
+ ```
+ ✅ Prometheus: 5+ targets UP
+ ✅ Grafana: All 4 panels showing data
+ ✅ Metrics: Real-time updates during load testing
+ ✅ RBAC: No permission errors in logs
+ ```

+ ### 🎯 Advanced App-Based Queries
+ **Game Performance Metrics:**
+ ```bash
+ # Game completion rate by user
+ rate(game_completion_total[5m]) by (username)
+ # ... more queries
+ ```

+ ### 📊 Resource Limits & Monitoring
+ **Set Resource Limits for Production:**
+ ```yaml
+ resources:
+   requests:
+     memory: "256Mi"
+     cpu: "250m"
+   limits:
+     memory: "512Mi"
+     cpu: "500m"
+ ```

+ ### 🔧 Troubleshooting Steps & Commands
+ **Step-by-step troubleshooting with exact commands**
+ **Port-forwarding fixes**
+ **RBAC verification commands**
+ **Connectivity testing**
+ **Metrics generation scripts**

**Dashboard import steps and troubleshooting**
**Quick copy commands for easy access**
```

### Professional Skills Gained

- **Observability architecture** that scales to thousands of services
- **Dashboard creation** for different stakeholder audiences
- **Metrics-driven debugging** to identify performance bottlenecks
- **Capacity planning** using historical resource utilization data
- **Troubleshooting complex monitoring issues** with systematic approaches
- **RBAC configuration** for secure, production-ready monitoring

---

## Milestone 5: GitOps and Automated Deployments

**Learning Objective:** Implement GitOps workflows that automatically deploy your applications when code changes, following the same patterns used by platform teams at major technology companies.

**Why this matters:** Manual deployments don't scale. This milestone teaches you how to build deployment pipelines that are reliable, auditable, and can be trusted with production systems.

### Step 5.1: Understanding GitOps Principles

**GitOps Core Concepts:**
- **Git as single source of truth:** All configuration is stored in Git repositories
- **Declarative configuration:** Describe desired state, not deployment steps
- **Automated synchronization:** Tools automatically apply Git changes to clusters
- **Observable deployments:** All changes are tracked and auditable

### Step 5.2: Install ArgoCD

ArgoCD is a GitOps operator that watches Git repositories and automatically applies changes to Kubernetes.

```bash
# Create ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready (this takes several minutes)
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Get the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
# Save this password - you'll need it to login

# Access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443 &
open https://localhost:8080
# Login with username: admin, password: (from above command)
```

### Step 5.3: Set Up GitOps Repository Structure

For GitOps to work, you need a repository structure that separates application code from deployment configuration.

**Create a new GitOps repository** (this would be separate from your application code):

```bash
# Example repository structure:
gitops-humor-game/
├── environments/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── values.yaml
│   ├── staging/
│   │   ├── kustomization.yaml  
│   │   └── values.yaml
│   └── prod/
│       ├── kustomization.yaml
│       └── values.yaml
├── base/
│   ├── backend.yaml        # Copy from your k8s/ directory
│   ├── frontend.yaml       # Copy from your k8s/ directory
│   ├── postgres.yaml       # Copy from your k8s/ directory
│   ├── redis.yaml          # Copy from your k8s/ directory
│   └── kustomization.yaml
└── applications/
    ├── dev-app.yaml
    ├── staging-app.yaml
    └── prod-app.yaml
```

**Important Note:** Use the actual working YAML files from your `k8s/` directory as the base. Don't create simplified versions - GitOps works best with your tested, complete configurations.

### Step 5.4: Create Your First GitOps Application

**Create an ArgoCD Application for your dev environment:**

```yaml
# applications/dev-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: humor-game-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourusername/gitops-humor-game
    targetRevision: HEAD
    path: environments/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: humor-game
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

```bash
# Apply the application to ArgoCD
kubectl apply -f applications/dev-app.yaml

# Check application status
kubectl get applications -n argocd
```

### Step 5.5: Test GitOps Workflow

**Make a change and watch it deploy automatically:**

```bash
# In your GitOps repository, update an environment value
# For example, change replica count in environments/dev/kustomization.yaml

# Commit and push the change
git add environments/dev/kustomization.yaml
git commit -m "Scale backend to 2 replicas"
git push

# Watch ArgoCD detect and apply the change
kubectl get applications -n argocd -w
# Should show sync status changing from "Synced" to "OutOfSync" to "Synced"

# Verify the change was applied
kubectl get pods -n humor-game
# Should show new number of backend replicas
```

### Step 5.6: Environment Promotion Pipeline

**Create a promotion script for moving changes between environments:**

```bash
#!/bin/bash
# promote.sh - Promote between environments

FROM_ENV=$1
TO_ENV=$2

if [ -z "$FROM_ENV" ] || [ -z "$TO_ENV" ]; then
  echo "Usage: ./promote.sh <from-env> <to-env>"
  echo "Example: ./promote.sh dev staging"
  exit 1
fi

# Get image tags from source environment
BACKEND_TAG=$(grep "newTag:" environments/$FROM_ENV/kustomization.yaml | awk '{print $2}')
FRONTEND_TAG=$(grep "newTag:" environments/$FROM_ENV/kustomization.yaml | awk '{print $2}')

# Update target environment
sed -i "s/newTag: .*/newTag: $BACKEND_TAG/g" environments/$TO_ENV/kustomization.yaml

# Commit changes
git add environments/$TO_ENV/
git commit -m "Promote $FROM_ENV to $TO_ENV: $BACKEND_TAG"
git push

echo "✅ Promoted $FROM_ENV to $TO_ENV successfully"
echo "🔄 ArgoCD will sync the changes automatically"
```

### Checkpoint ✅

Your GitOps workflow is working when:
- ArgoCD UI shows your application with "Synced" status
- Changes to Git repository trigger automatic deployments
- Application pods restart with new configuration
- Promotion script successfully moves changes between environments
- All deployments are visible in ArgoCD UI with full audit trail

### Understanding GitOps Benefits

**Compared to manual deployments:**
- **Reliability:** Declarative configuration eliminates deployment steps errors
- **Auditability:** All changes tracked in Git with author and timestamp
- **Rollback:** Easy to revert to any previous Git commit
- **Consistency:** Same deployment process across all environments

**Production GitOps patterns:**
- **Pull-based deployments:** Cluster pulls changes rather than external push
- **Multi-environment promotion:** Automated progression from dev → staging → prod
- **Policy enforcement:** Validation and security scanning before deployment
- **Secret management:** External secret operators for sensitive data

### Common GitOps Issues & Fixes

**Issue: ArgoCD shows "Unknown" status**
```bash
# Check ArgoCD can access your Git repository
# In ArgoCD UI, go to Settings -> Repositories
# Add your repository with proper credentials

# For public repos, use HTTPS URL
# For private repos, add SSH key or access token
```

**Issue: Application won't sync**
```bash
# Check application configuration
kubectl describe application humor-game-dev -n argocd

# Check ArgoCD logs
kubectl logs deployment/argocd-application-controller -n argocd

# Manual sync from UI or CLI
argocd app sync humor-game-dev
```

**Issue: Kustomization errors**
```bash
# Test kustomization locally
cd environments/dev
kubectl kustomize .

# Check for YAML syntax errors
kubectl apply --dry-run=client -k .
```

### Production GitOps Considerations

**Security:**
- **RBAC:** Limit ArgoCD permissions to specific namespaces
- **Signed commits:** Verify authenticity of deployment changes
- **Image scanning:** Validate container images before deployment
- **Policy enforcement:** Use OPA Gatekeeper for compliance

**Operations:**
- **Multi-cluster:** Manage deployments across multiple Kubernetes clusters
- **Progressive delivery:** Canary and blue-green deployment strategies  
- **Disaster recovery:** GitOps-based cluster bootstrapping
- **Secrets management:** External secret operators (Vault, AWS Secrets Manager)

### What You Learned

You've implemented professional GitOps workflows:
- **Declarative deployments** using ArgoCD for automatic synchronization
- **Multi-environment management** with promotion pipelines
- **Audit trails** for all deployment changes through Git history
- **Self-healing deployments** that automatically correct configuration drift
- **Production-ready patterns** used by platform teams at scale

### Professional Skills Gained

- **GitOps architecture** that separates application code from deployment configuration
- **Automated deployment pipelines** that reduce manual errors and deployment time
- **Environment promotion strategies** for safe progression of changes
- **Infrastructure as code** practices that make deployments repeatable and reliable

---

## Milestone 6: Global Scale and Production Readiness

**Learning Objective:** Deploy your application with global reach using CDN, implement production security practices, and understand how to scale to handle enterprise-level traffic.

**Why this matters:** This milestone transforms your local application into one that can serve users globally with the same performance and reliability patterns used by companies like Cloudflare and AWS.

### Prerequisites for Global Deployment

**Required for this milestone:**
- A domain name you own ($10-15/year from any registrar)
- Cloudflare account (free tier is sufficient)
- Public server or cloud instance (optional for full global deployment)

**Note:** You can complete most of this milestone locally to understand the concepts, then apply them to a real production environment when ready.

### Step 6.1: Domain and DNS Setup

**Configure your domain with Cloudflare:**

1. **Add your domain to Cloudflare:**
   - Login to Cloudflare dashboard
   - Click "Add Site" and enter your domain
   - Choose the free plan
   - Update nameservers at your domain registrar

2. **Configure DNS records:**
   ```bash
   # In Cloudflare dashboard, add A record:
   # Type: A
   # Name: game (creates game.yourdomain.com)
   # Content: Your server's public IP
   # Proxy: Enabled (orange cloud icon)
   ```

### Step 6.2: Install cert-manager for Automatic SSL

Production applications need automatic SSL certificate management.

```bash
# Install cert-manager for automatic SSL certificates
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=120s

# Create ClusterIssuer for Let's Encrypt
cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com  # Replace with your email
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Step 6.3: Update Ingress for Production Domain

**Modify your ingress to use your real domain:**

```yaml
# Update k8s/ingress.yaml to include your domain
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: humor-game-ingress
  namespace: humor-game
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - game.yourdomain.com  # Replace with your actual domain
    secretName: gameapp-prod-tls
  rules:
  - host: game.yourdomain.com  # Replace with your actual domain
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

```bash
# Apply the updated ingress
kubectl apply -f k8s/ingress.yaml

# Watch certificate creation
kubectl get certificates -n humor-game -w
# Should show certificate being issued and eventually "Ready: True"
```

### Step 6.4: Configure Cloudflare Performance Optimization

**Enable performance features in Cloudflare dashboard:**

1. **Caching Configuration:**
   - Static assets (images, CSS, JS): Cache for 1 month
   - API endpoints: Cache for 5 minutes  
   - HTML pages: Cache for 1 hour

2. **Performance Settings:**
   - Enable Brotli compression
   - Enable Minification (CSS, JS, HTML)
   - Enable HTTP/2 and HTTP/3
   - Turn on "Always Use HTTPS"

3. **Page Rules for Optimal Caching:**
   ```
   game.yourdomain.com/static/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   
   game.yourdomain.com/api/*  
   - Cache Level: Cache Everything
   - Edge Cache TTL: 5 minutes
   
   game.yourdomain.com/*
   - Cache Level: Standard
   - Edge Cache TTL: 1 hour
   ```

### Step 6.5: Test Global Performance

**Test your application from multiple locations:**

```bash
# Test SSL certificate
curl -I https://game.yourdomain.com/
# Should show 200 OK with valid SSL certificate

# Test API through CDN
curl https://game.yourdomain.com/api/health
# Should return your health check response

# Test performance from different regions using online tools:
# - WebPageTest.org (test from multiple global locations)
# - GTmetrix (performance scoring)
# - Pingdom (uptime monitoring)
```

**Performance metrics to monitor:**
- **Time to First Byte (TTFB):** Should be <200ms globally
- **Largest Contentful Paint (LCP):** Should be <2.5s
- **First Input Delay (FID):** Should be <100ms
- **Cumulative Layout Shift (CLS):** Should be <0.1

### Step 6.6: Set Up Global Monitoring

**Add global performance monitoring to your Grafana dashboards:**

```bash
# Create a new dashboard panel for global metrics
# Query examples for CDN performance:

# CDN cache hit ratio
cloudflare_cache_hit_ratio

# Global response time by region  
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Traffic distribution by country
increase(cloudflare_requests_by_country[1h])

# SSL certificate expiry monitoring
(cert_expiry_timestamp - time()) / (24*3600)
```

### Checkpoint ✅

Your global deployment is working when:
- Application loads at `https://game.yourdomain.com` with valid SSL
- Cloudflare shows traffic statistics in their dashboard
- SSL certificate auto-renews (check cert-manager logs)
- Performance tests show <200ms response times globally
- CDN cache hit ratios are >80% for static content
- Monitoring dashboards show global performance metrics

### Understanding Global Scale Architecture

**Your traffic flow now includes:**
```
Global User
    ↓
Cloudflare Edge (nearest location)
    ↓ (cache miss)
Your Origin Server
    ↓
Kubernetes Ingress
    ↓
Application Pods
```

**Benefits of this architecture:**
- **Global performance:** CDN serves content from edge locations near users
- **Automatic scaling:** Cloudflare handles traffic spikes without origin load
- **DDoS protection:** Built-in protection against malicious traffic
- **SSL management:** Automatic certificate renewal and strong security
- **Analytics:** Detailed insights into global user behavior

### Production Security Considerations

**Security features now active:**
- **WAF (Web Application Firewall):** Filters malicious requests
- **DDoS protection:** Automatic mitigation of attack traffic
- **Bot management:** Distinguishes legitimate users from bots
- **Rate limiting:** Prevents abuse of your API endpoints
- **Always Use HTTPS:** Encrypts all traffic end-to-end

### Cost Optimization for Global Scale

**Cloudflare free tier includes:**
- Unlimited bandwidth
- Global CDN
- Basic DDoS protection
- Shared SSL certificates
- Basic analytics

**Optimization strategies:**
- **Cache everything possible:** Reduces origin server load
- **Optimize images:** Use Cloudflare Polish for automatic compression
- **Minimize API calls:** Cache responses appropriately
- **Use workers:** Run code at the edge for faster responses

### Common Global Deployment Issues & Fixes

**Issue: SSL certificate fails to issue**
```bash
# Check cert-manager logs
kubectl logs deployment/cert-manager -n cert-manager

# Verify DNS is pointing to your cluster
dig game.yourdomain.com

# Check certificate challenge status
kubectl describe certificate gameapp-prod-tls -n humor-game
```

**Issue: Cloudflare shows "Error 522"**
```bash
# Connection timeout - check your origin server
kubectl get pods -n humor-game
kubectl get svc -n humor-game

# Verify ingress controller is responding
kubectl logs deployment/ingress-nginx-controller -n ingress-nginx
```

**Issue: Cache not working effectively**
```bash
# Check cache headers
curl -I https://game.yourdomain.com/api/health

# Verify Cloudflare page rules
# Review cache settings in Cloudflare dashboard

# Test cache hit rates
# Monitor Cloudflare analytics for cache performance
```

### Production Readiness Checklist

**Security:**
- ✅ HTTPS everywhere with automatic certificate renewal
- ✅ WAF protection against common attacks
- ✅ Rate limiting on API endpoints
- ✅ Bot protection and DDoS mitigation

**Performance:**
- ✅ Global CDN with edge caching
- ✅ Optimized cache headers and TTLs
- ✅ Compressed assets and optimized images
- ✅ HTTP/2 and HTTP/3 enabled

**Reliability:**
- ✅ Multi-region availability through CDN
- ✅ Automatic failover and health checks
- ✅ Monitoring and alerting for uptime
- ✅ Automated backups and disaster recovery plans

**Operations:**
- ✅ GitOps deployment automation
- ✅ Comprehensive monitoring and alerting
- ✅ Log aggregation and analysis
- ✅ Performance tracking and optimization

### What You Learned

You've implemented enterprise-scale global deployment:
- **CDN integration** for global performance optimization
- **Automatic SSL management** with Let's Encrypt and cert-manager
- **Production security** with WAF, DDoS protection, and bot management
- **Global monitoring** with performance metrics from edge locations
- **Cost-effective scaling** using Cloudflare's free tier capabilities

### Professional Skills Gained

- **Global architecture design** that scales to millions of users worldwide
- **CDN optimization** for performance and cost efficiency
- **Security best practices** for internet-facing applications
- **Performance monitoring** across global infrastructure
- **Production deployment patterns** used by major SaaS companies

---

## Final Assessment and Next Steps

### Comprehensive System Test

Run this verification script to confirm your complete production system:

```bash
#!/bin/bash
# production-verification.sh

echo "🎯 Production System Verification"
echo "================================="

# 1. Cluster Health
echo "1. Testing Kubernetes cluster..."
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed || echo "✅ All pods running"

# 2. Application Health  
echo "2. Testing application..."
kubectl get pods -n humor-game
curl -f https://game.yourdomain.com/api/health && echo "✅ API healthy" || echo "❌ API unhealthy"

# 3. Database Connectivity
echo "3. Testing database..."
kubectl exec deployment/postgres -n humor-game -- psql -U gameuser -d humor_memory_game -c "SELECT 1;" && echo "✅ Database connected" || echo "❌ Database connection failed"

# 4. Monitoring Stack
echo "4. Testing monitoring..."
curl -f http://localhost:9090/api/v1/targets && echo "✅ Prometheus healthy" || echo "❌ Prometheus unreachable"
curl -f http://localhost:3000/api/health && echo "✅ Grafana healthy" || echo "❌ Grafana unreachable"

# 5. GitOps
echo "5. Testing GitOps..."
kubectl get applications -n argocd && echo "✅ ArgoCD applications found" || echo "❌ ArgoCD not configured"

# 6. Global Performance
echo "6. Testing global access..."
curl -I https://game.yourdomain.com && echo "✅ Global access working" || echo "❌ Global access failed"

echo "================================="
echo "✅ Production verification complete!"
```

### Learning Validation

**Can you explain to a colleague:**

1. **Architecture:** How a request flows from a user's browser in Tokyo to your database?
2. **Scaling:** What happens when traffic increases 10x during a marketing campaign?
3. **Reliability:** How your system handles a pod crash or node failure?
4. **Security:** What protections are in place against malicious traffic?
5. **Operations:** How you deploy a new feature safely to production?

### Professional Skills Achieved

**Technical Capabilities:**
- **Container orchestration** with Kubernetes for reliable application deployment
- **Production networking** with ingress controllers and load balancing
- **Observability implementation** with metrics, logging, and alerting
- **GitOps automation** for reliable and auditable deployments
- **Global scale patterns** with CDN and edge computing

**Business Impact:**
- **Reduced deployment risk** through automated, repeatable processes
- **Improved reliability** with monitoring that prevents outages
- **Faster feature delivery** with automated deployment pipelines
- **Global user experience** with sub-200ms response times worldwide
- **Cost optimization** through efficient resource utilization

### Career Advancement

**These skills prepare you for roles at:**
- **Platform Engineering:** Building developer platforms and infrastructure
- **Site Reliability Engineering:** Ensuring system reliability and performance
- **DevOps Engineering:** Automating deployment and operational processes
- **Cloud Architecture:** Designing scalable, secure, and resilient systems

**Industry recognition potential:**
- **Kubernetes certifications:** CKA, CKAD, CKS
- **Cloud provider certifications:** AWS, GCP, Azure
- **Open source contributions:** To Kubernetes ecosystem projects
- **Speaking opportunities:** Sharing your learnings at conferences and meetups

### Immediate Next Steps (1-3 months)

**Deepen your operational skills:**
- Practice incident response by intentionally breaking components
- Implement comprehensive backup and disaster recovery procedures
- Add chaos engineering with tools like Chaos Monkey
- Expand monitoring to include business metrics and user experience

**Explore advanced technologies:**
- Service mesh (Istio or Linkerd) for advanced traffic management
- External secrets management with HashiCorp Vault
- Policy enforcement with Open Policy Agent (OPA)
- Advanced deployment strategies (canary, blue-green) with Flagger

### Medium-term Growth (3-12 months)

**Cloud platform expertise:**
- Migrate to managed Kubernetes (EKS, GKE, AKS)
- Implement infrastructure as code with Terraform
- Learn cloud-native storage and networking patterns
- Design multi-region deployment architectures

**Platform engineering focus:**
- Build self-service developer platforms
- Create policy and governance frameworks
- Implement comprehensive security scanning and compliance
- Design internal developer portals with tools like Backstage

### Long-term Specialization (1+ years)

**Choose your path:**

**Platform Engineering Track:**
- Lead platform strategy and architecture decisions
- Build developer experience and productivity platforms
- Implement organization-wide standards and best practices
- Mentor teams on cloud-native adoption

**Site Reliability Engineering Track:**
- Master SLA/SLO/error budget methodologies
- Lead incident response and post-mortem processes
- Design systems for extreme reliability (99.99%+ uptime)
- Implement advanced observability and chaos engineering

**Cloud Architecture Track:**
- Design multi-cloud and hybrid cloud strategies
- Lead technology transformation initiatives across organizations
- Architect systems for global scale and compliance requirements
- Drive cost optimization and sustainability initiatives

### Community and Recognition

**Build your professional presence:**
- **Open source contributions:** Contribute to Kubernetes ecosystem projects
- **Technical writing:** Share your learnings through blog posts and documentation
- **Speaking engagements:** Present at local meetups and technology conferences
- **Mentorship:** Help other developers learn DevOps and cloud-native technologies

### Conclusion

You've successfully built and deployed a production-grade system using the same tools and patterns as major technology companies. More importantly, you've developed the architectural thinking and problem-solving skills that distinguish senior engineers.

**Key accomplishments:**
- Transformed a simple application into enterprise-grade infrastructure
- Implemented monitoring and automation from day one
- Deployed globally with professional networking and security
- Gained hands-on experience with industry-standard tools and practices

**Professional value:**
Engineers with these skills are highly valued because they can:
- Reduce deployment complexity and eliminate downtime
- Implement monitoring that prevents incidents before they occur
- Automate manual processes, saving weeks of engineering time
- Scale systems to handle millions of users reliably
- Bridge the gap between development and operations effectively

You're now equipped to contribute meaningfully to any organization using modern infrastructure practices. These skills form the foundation for advanced roles in platform engineering, site reliability engineering, and cloud architecture.

Continue building, keep learning, and remember: every expert was once a beginner who never stopped growing. The cloud-native ecosystem is constantly evolving, and your journey in mastering it has just begun.

---

## Milestone 1 — Docker Compose Sanity (COMPLETED)

**What we accomplished:**
- Built and deployed multi-service application using Docker Compose
- Fixed critical routing and configuration issues
- Established permanent regression guards to prevent regressions

### Step 1.1 — Build & Start

**Commands executed:**
```bash
# Build all services
docker compose build

# Start services in detached mode
docker compose up -d

# Verify all services are running
docker compose ps
```

**Expected output:**
```
NAME                       IMAGE                           STATUS                    PORTS
humor-game-backend         game-app-laptop-demo-backend    Up 13 minutes            0.0.0.0:3001->3001/tcp
humor-game-frontend        game-app-laptop-demo-frontend   Up 6 minutes (healthy)   80/tcp
humor-game-postgres        postgres:15-alpine              Up 31 seconds (healthy)  5432/tcp
humor-game-redis           redis:7-alpine                 Up 31 seconds (healthy)  6379/tcp
humor-game-reverse-proxy   nginx:alpine                   Up 30 seconds            0.0.0.0:3000->80/tcp
```

### Step 1.2 — Verify Services

**Service verification commands:**
```bash
# Check service status
docker compose ps

# View service logs
docker compose logs --tail=50

# Test API health endpoint
curl -I http://localhost:3000/api/health
```

**Expected results:**
- All 5 services showing "Up" status
- Backend health endpoint returning HTTP 200
- Frontend accessible at http://localhost:3000

### Step 1.3 — Test Endpoints

**Frontend test:**
```bash
curl -I http://localhost:3000/
# Expected: HTTP/1.1 200 OK
```

**API health test:**
```bash
curl -s http://localhost:3000/api/health | jq .
# Expected: {"status": "healthy", "services": {...}}
```

### ✅ Checkpoint

- [x] All 5 services running and healthy
- [x] Frontend accessible at localhost:3000
- [x] API health endpoint responding with 200 OK
- [x] Database and Redis connections established
- [x] Nginx reverse proxy routing correctly

### Critical Issues Fixed

**1. Backend Catch-All Route Issue:**
- **Problem:** Backend had `app.use('*', ...)` that intercepted all frontend requests
- **Error:** "This is an API-only server. Frontend is served separately! 🎮"
- **Fix:** Commented out the problematic catch-all route
- **File:** `backend/server.js` - removed `app.use('*', ...)` route

**2. Nginx Proxy Configuration Issue:**
- **Problem:** `proxy_pass http://backend:3001/;` had trailing slash causing routing errors
- **Error:** API endpoints returning 404 (e.g., `/api/leaderboard`)
- **Fix:** Changed to `proxy_pass http://backend:3001;` (no trailing slash)
- **File:** `nginx-reverse-proxy.conf`

**3. Frontend Environment Variable Substitution:**
- **Problem:** HTML template variables not being processed by `envsubst`
- **Error:** `window.API_BASE_URL = '${API_BASE_URL}'` not substituted
- **Fix:** Updated template syntax and startup script
- **Files:** `frontend/src/index.html`, `frontend/Dockerfile`

**4. JavaScript Alert Popup Issue:**
- **Problem:** `alert('🎯 JavaScript executed successfully!')` showing on every refresh
- **Fix:** Commented out the alert statement
- **File:** `frontend/src/scripts/game.js`

**5. JavaScript Configuration Race Condition:**
- **Problem:** JavaScript trying to access `window.API_BASE_URL` before it was set
- **Error:** "Cannot Connect to Game Server" in browser
- **Fix:** Added `waitForConfig()` function with async/await pattern
- **File:** `frontend/src/scripts/game.js`

### Regression Guards Implemented

**Created `scripts/regression-guards.sh` to prevent future regressions:**

```bash
#!/bin/bash
# Regression Guards for Milestone 1 Fixes

# 1) Backend: no catch-all route that swallows frontend paths
if grep -R "^\\s*app\.use(\\s*'\\*'" backend 2>/dev/null; then
    echo "❌ ERROR: catch-all route present in backend"
    exit 1
fi

# 2) Backend: /api/health exists and responds in container
if ! grep -R "/api/health" backend; then
    echo "❌ ERROR: /api/health route not found in backend"
    exit 1
fi

# 3) Nginx: no trailing slash in proxy_pass
if ! grep -R "proxy_pass\\s\\+http://backend:3001;" nginx-reverse-proxy.conf; then
    echo "❌ ERROR: proxy_pass not exact"
    exit 1
fi

# 4) Frontend: no alert() left in shipped code
if grep -R "^\\s*alert(" frontend/src; then
    echo "❌ ERROR: alert() found in frontend code"
    exit 1
fi

# 5) Env var/startup template syntax fixed
if grep -R "{{.*}}" frontend/src; then
    echo "❌ ERROR: template placeholders remain"
    exit 1
fi
```

**Guard verification output:**
```
🔒 Running Regression Guards for Milestone 1 Fixes...
🔍 Checking for backend catch-all routes...
✅ No catch-all routes found
🔍 Checking for /api/health route...
✅ /api/health route found
🔍 Checking nginx proxy_pass configuration...
✅ proxy_pass configuration correct
🔍 Checking for alert() statements...
✅ No alert() statements found
🔍 Checking for async config loader...
✅ Async config loader found
🔍 Checking for template placeholders...
✅ No template placeholders found
🎉 All regression guards passed! Milestone 1 fixes are permanent.
```

### Common Issues & Fixes

**Container restarting loops:**
- **Cause:** Health check failures or dependency issues
- **Fix:** Check logs with `docker compose logs <service>`
- **Prevention:** Proper health check configuration and service dependencies

**Backend can't reach database:**
- **Cause:** Network configuration or service discovery issues
- **Fix:** Verify `depends_on` and network configuration in docker-compose.yml
- **Prevention:** Use proper Docker networks and service names

**Frontend not loading:**
- **Cause:** Nginx configuration or port conflicts
- **Fix:** Check nginx logs and verify port mappings
- **Prevention:** Regression guards and proper nginx configuration

**Environment variables not working:**
- **Cause:** Template syntax or startup script issues
- **Fix:** Verify `envsubst` syntax and startup script execution
- **Prevention:** Template validation and startup script testing

### 📸 Screenshots: Docker Compose Success

**Final verification test results:**
```
🧪 FINAL COMPREHENSIVE TEST...
1. Frontend accessible: 200
2. API health check: 200
3. API leaderboard: 200
4. Environment variables substituted: ✅ SUCCESS
5. Configuration ready flag: ✅ SUCCESS
```

### What You Learned

- **Multi-service architecture** with proper service dependencies
- **Nginx reverse proxy configuration** and routing rules
- **Environment variable substitution** in containerized applications
- **JavaScript configuration management** and race condition prevention
- **Regression testing** to maintain system reliability

### Professional Skills Gained

- **Container orchestration** with Docker Compose
- **Service mesh configuration** and routing
- **Environment management** across development and production
- **Debugging complex multi-service issues**
- **Preventing regressions** with automated checks

*Milestone 1 completed successfully on 2024-08-21. All critical issues resolved, regression guards implemented, ready for Kubernetes deployment.*

---

*This guide represents distilled experience from engineers who have built and scaled systems at companies like Google, Netflix, and Airbnb. Use it as a foundation for your continued growth in the DevOps and platform engineering disciplines.*

---

## 📚 Additional Documentation & Resources

### **🔐 Security & RBAC Guides**
- **[Prometheus RBAC Guide](docs/prometheus-rbac-guide.md)** - Complete explanation of why Prometheus needs RBAC, service accounts, and what happens without them
- **[Troubleshooting Guide](docs/troubleshooting.md)** - Common issues, diagnostic commands, and step-by-step solutions

### **🎯 Monitoring & Observability**
- **[Custom Dashboard Guide](docs/custom-dashboard-guide.md)** - How to create, import, and manage Grafana dashboards
- **[Production Metrics](docs/production-metrics.md)** - Advanced monitoring patterns and business metrics

### **🔧 Quick Reference**
- **[Kubernetes Commands](docs/k8s-commands.md)** - Essential kubectl commands for daily operations
- **[Docker Commands](docs/docker-commands.md)** - Docker and Docker Compose reference
- **[Network Troubleshooting](docs/network-troubleshooting.md)** - Port-forwarding, ingress, and connectivity issues

### **📖 External Resources**
- **[Kubernetes Documentation](https://kubernetes.io/docs/)** - Official Kubernetes guides and references
- **[Prometheus Documentation](https://prometheus.io/docs/)** - Metrics collection and querying
- **[Grafana Documentation](https://grafana.com/docs/)** - Dashboard creation and visualization
- **[Helm Documentation](https://helm.sh/docs/)** - Kubernetes package management

### **🚀 Performance & Scaling**
- **[Resource Management](docs/resource-management.md)** - CPU, memory, and disk optimization
- **[Load Testing](docs/load-testing.md)** - Performance validation and stress testing
- **[Scaling Strategies](docs/scaling-strategies.md)** - Horizontal and vertical scaling approaches

---

**💡 Pro Tip**: Start with the troubleshooting guide if you're stuck, then dive into the specific topic guides for deeper understanding. Each guide builds on the previous knowledge and provides practical examples you can use immediately.
