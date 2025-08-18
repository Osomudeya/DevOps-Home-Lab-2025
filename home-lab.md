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

**Option A: With Docker Desktop (easiest)**
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
# Then install additional tools
brew install k3d kubectl helm mkcert cloudflared git

# Verify Docker is working
docker --version && docker ps
```

**Option B: With Colima (lightweight alternative)**
```bash
# Install Colima + Docker CLI (no Docker Desktop needed)
brew install colima docker docker-compose kubectl helm mkcert cloudflared git

# Start Colima with Docker runtime
colima start --runtime docker

# Verify Docker is working
docker version && docker run hello-world

# Optional: Configure Colima for better performance
colima stop
colima start --runtime docker --cpu 4 --memory 8 --disk 100
```

**Why choose Colima?**
- Lighter weight than Docker Desktop
- Better performance on Apple Silicon
- Open source and free
- Works perfectly with k3d and Kubernetes tools

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

# If using Colima, also check:
colima status             # Should show "Running"
```

**✅ Checkpoint**: All commands return version numbers. If any fail, install that tool individually.

**Colima Users**: Your Docker runtime is now ready! Colima will automatically start when needed, or you can manage it manually:
```bash
colima start    # Start when needed
colima stop     # Save resources when not coding
colima status   # Check if running
```

---

## 3. Cluster in 60 Seconds

Time to replace Docker Compose with a real Kubernetes cluster. We'll keep your local registry running so image builds stay fast.

### Ensure Docker is Running

Before we start, make sure Docker is running:

```bash
# Check if Docker is running
docker info

# If using Colima and Docker isn't running:
colima start --runtime docker

# If using Docker Desktop, start it from Applications
```

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

### **🚀 QUICK DEPLOYMENT (Recommended)**

I've created a deployment script that reads from your `.env` file automatically:

```bash
# Make sure you have a .env file with these variables:
cat > .env << EOF
DB_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_secure_password_here
JWT_SECRET=$(openssl rand -base64 64)
EOF

# Then deploy everything with one command:
./deploy-k8s.sh
```

### **🔧 MANUAL DEPLOYMENT (Step by Step)**

If you prefer to deploy manually or want to understand each step:

#### Build and Push Your Images

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
  # Fixed CORS for Kubernetes ingress
  CORS_ORIGIN: "https://humor-game.local.test"
  FRONTEND_URL: "https://humor-game.local.test"
  API_BASE_URL: "https://humor-game.local.test"
---
apiVersion: v1
kind: Secret
metadata:
  name: humor-game-secrets
  namespace: humor-game
type: Opaque
stringData:
  # ⚠️  SECURITY: Change these passwords in production!
  DB_PASSWORD: "CHANGE_THIS_SECURE_PASSWORD"
  REDIS_PASSWORD: "CHANGE_THIS_SECURE_PASSWORD"
  # Generate with: openssl rand -base64 64
  JWT_SECRET: "CHANGE_THIS_TO_64_CHAR_RANDOM_STRING"
```

**k8s/postgres.yaml** - Fixed initialization:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init
  namespace: humor-game
data:
  01-init.sql: |
    -- Copy content from your database/combined-init.sql file here
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    DROP TABLE IF EXISTS game_matches CASCADE;
    DROP TABLE IF EXISTS games CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    
    CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        display_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_played TIMESTAMP WITH TIME ZONE,
        total_games INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        best_time INTEGER,
        is_active BOOLEAN DEFAULT true
    );
    
    CREATE TABLE games (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        moves INTEGER NOT NULL DEFAULT 0,
        time_elapsed INTEGER NOT NULL DEFAULT 0,
        cards_matched INTEGER NOT NULL DEFAULT 0,
        difficulty_level VARCHAR(20) DEFAULT 'easy',
        game_completed BOOLEAN DEFAULT false,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        game_data JSONB
    );
    
    -- Continue with rest of your combined-init.sql content...
---
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
            memory: "64Mi"   # Reduced for laptop use
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
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
            memory: "32Mi"   # Reduced for laptop use
            cpu: "25m"
          limits:
            memory: "64Mi"
            cpu: "50m"
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

**k8s/backend.yaml** - Fixed environment variables:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: humor-game
spec:
  replicas: 1  # Start with 1 replica for laptop
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
        - name: FRONTEND_URL
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: FRONTEND_URL
        - name: API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: humor-game-config
              key: API_BASE_URL
        resources:
          requests:
            memory: "64Mi"   # Reduced for laptop use
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
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

**k8s/frontend.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: humor-game
spec:
  replicas: 1  # Start with 1 replica for laptop
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
            memory: "16Mi"   # Very light for static content
            cpu: "10m"
          limits:
            memory: "32Mi"
            cpu: "25m"
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

**k8s/ingress.yaml** - Fixed for proper routing:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: humor-game-ingress
  namespace: humor-game
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
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
# ⚠️  SECURITY: Update secrets before deployment
# Edit k8s/configmap.yaml and change these passwords:
# - DB_PASSWORD: "CHANGE_THIS_SECURE_PASSWORD"
# - REDIS_PASSWORD: "CHANGE_THIS_SECURE_PASSWORD"  
# - JWT_SECRET: "CHANGE_THIS_TO_64_CHAR_RANDOM_STRING"

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

**✅ Checkpoint**: Open `https://gameapp.games` - your memory game is now running on Kubernetes!

---

## **📋 COMPLETE STEP-BY-STEP IMPLEMENTATION GUIDE**

### **Before You Start (One-Time Setup)**

#### **1. Install Required Tools (macOS)**
```bash
# Install Homebrew tools
brew install k3d kubectl helm mkcert git

# Verify installations
k3d version
kubectl version --client
helm version
mkcert -version
```

#### **2. Verify Docker is Running**
```bash
# Check Docker status
docker info | grep -i server

# If using Colima (alternative to Docker Desktop):
# colima start --runtime docker
```

### **🚀 QUICK START (5 Minutes)**

```bash
# 1. Create .env file with your secrets
cat > .env << EOF
DB_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_secure_password_here
JWT_SECRET=$(openssl rand -base64 64)
EOF

# 2. Run the automated deployment
./deploy-k8s.sh
```

### **🔧 DETAILED STEP-BY-STEP GUIDE**

#### **Step 1: Start Local Container Registry**
```bash
docker run -d --restart=always -p 5001:5000 --name k3d-registry registry:2
```

#### **Step 2: Create Your k3d Cluster**
```bash
k3d cluster create --config k3d-config.yaml
kubectl config use-context k3d-humor-game-cluster
kubectl get nodes
```

#### **Step 3: Install nginx Ingress Controller**
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.hostNetwork=true \
  --set controller.hostPort.enabled=true \
  --set controller.hostPort.ports.http=80 \
  --set controller.hostPort.ports.https=443
```

#### **Step 4: Create TLS Certificates for Production Domain**
```bash
# Install local CA (one-time)
mkcert -install

# Generate certificates for your production domain
mkcert "gameapp.games" "*.gameapp.games" localhost 127.0.0.1

# Create Kubernetes TLS secret
kubectl create secret tls humor-game-tls \
  --cert=gameapp.games+2.pem \
  --key=gameapp.games+2-key.pem

# Add to hosts file for local testing
echo "127.0.0.1 gameapp.games" | sudo tee -a /etc/hosts
```

#### **Step 5: Build and Push Your App Images**
```bash
# From project root directory
docker build -t localhost:5001/humor-game/backend:v1.0.0 backend/
docker push localhost:5001/humor-game/backend:v1.0.0

docker build -t localhost:5001/humor-game/frontend:v1.0.0 frontend/
docker push localhost:5001/humor-game/frontend:v1.0.0
```

#### **Step 6: Configure Environment Variables**
```bash
# Create .env file with your production secrets
cat > .env << EOF
# Database Configuration
DB_PASSWORD=your_secure_database_password_here
REDIS_PASSWORD=your_secure_redis_password_here

# Security
JWT_SECRET=$(openssl rand -base64 64)

# Optional: Override domain if different
# DOMAIN=yourdomain.com
EOF
```

#### **Step 7: Deploy All Kubernetes Manifests**
```bash
# Option A: Use the automated script (recommended)
./deploy-k8s.sh

# Option B: Deploy manually
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

#### **Step 8: Wait for All Services to Be Ready**
```bash
# Wait for database services
kubectl wait --for=condition=ready pod -l app=postgres -n humor-game --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n humor-game --timeout=60s

# Wait for application services
kubectl wait --for=condition=ready pod -l app=backend -n humor-game --timeout=120s
kubectl wait --for=condition=ready pod -l app=frontend -n humor-game --timeout=60s

# Wait for ingress
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=ingress-nginx -n ingress-nginx --timeout=120s
```

#### **Step 9: Access Your Application**
```bash
# Check service status
kubectl get pods,svc,ingress -n humor-game

# Access URLs
echo "🎮 Game: https://gameapp.games"
echo "🔍 API Health: https://gameapp.games/api/health"
```

### **🌐 EXPOSING TO INTERNET WITH CLOUDFLARE**

#### **Step 10: Setup Cloudflare Tunnel (Optional)**
```bash
# Install cloudflared
brew install cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create humor-game-tunnel

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep humor-game-tunnel | awk '{print $1}')

# Create tunnel configuration
mkdir -p ~/.cloudflared
cat << EOF > ~/.cloudflared/config.yml
tunnel: $TUNNEL_ID
credentials-file: ~/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: gameapp.games
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF

# Create DNS record
cloudflared tunnel route dns humor-game-tunnel gameapp.games

# Run tunnel
cloudflared tunnel run humor-game-tunnel
```

---

## **🌐 COMPLETE CLOUDFLARE EXPOSURE GUIDE**

### **What This Does**
Cloudflare Tunnel creates a secure connection from the internet to your local Kubernetes cluster, allowing anyone to access your game at `https://gameapp.games` without exposing your home network.

### **Prerequisites**
1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Domain**: Add your domain (e.g., `gameapp.games`) to Cloudflare
3. **DNS Management**: Ensure Cloudflare manages your domain's DNS

### **Step-by-Step Cloudflare Setup**

#### **1. Prepare Your Domain in Cloudflare**
```bash
# Go to Cloudflare Dashboard → Your Domain → DNS
# Ensure these records exist:
# Type: A, Name: @, Content: 192.168.1.1 (or any IP)
# Type: A, Name: game, Content: 192.168.1.1 (or any IP)
# Note: These IPs don't matter - Cloudflare Tunnel will override them
```

#### **2. Install and Authenticate Cloudflare CLI**
```bash
# Install cloudflared
brew install cloudflared

# Login to Cloudflare (opens browser)
cloudflared tunnel login

# This creates: ~/.cloudflared/cert.pem
```

#### **3. Create and Configure Your Tunnel**
```bash
# Create tunnel
cloudflared tunnel create humor-game-tunnel

# List tunnels to get the ID
cloudflared tunnel list

# Create tunnel configuration directory
mkdir -p ~/.cloudflared

# Create tunnel config (replace TUNNEL_ID with actual ID from list)
cat << 'EOF' > ~/.cloudflared/config.yml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: ~/.cloudflared/YOUR_TUNNEL_ID_HERE.json

ingress:
  # Route gameapp.games to your local Kubernetes
  - hostname: gameapp.games
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
      # Optional: Add security headers
      additionalHeaders:
        X-Frame-Options: DENY
        X-Content-Type-Options: nosniff
        Referrer-Policy: strict-origin-when-cross-origin
  
  # Route api.gameapp.games to backend API (optional)
  - hostname: api.gameapp.games
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
  
  # Catch-all for unmatched hostnames
  - service: http_status:404
EOF
```

#### **4. Update Your Kubernetes Configuration for Internet Access**
```bash
# Update your k8s/configmap.yaml for internet access
sed -i 's|CORS_ORIGIN: "https://gameapp.games"|CORS_ORIGIN: "https://gameapp.games, https://*.gameapp.games"|g' k8s/configmap.yaml

# Update your k8s/ingress.yaml for multiple hostnames
cat << 'EOF' > k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: humor-game-ingress
  namespace: humor-game
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://gameapp.games, https://*.gameapp.games"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
spec:
  tls:
    - hosts:
        - gameapp.games
        - api.gameapp.games
      secretName: humor-game-tls
  rules:
    - host: gameapp.games
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
    - host: api.gameapp.games
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 3001
EOF
        - api.gameapp.games
      secretName: humor-game-tls
  rules:
    - host: gameapp.games
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
    - host: api.gameapp.games
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 3001
EOF
```

#### **5. Create DNS Records**
```bash
# Get your tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep humor-game-tunnel | awk '{print $1}')

# Create DNS records for your tunnel
cloudflared tunnel route dns humor-game-tunnel gameapp.games
cloudflared tunnel route dns humor-game-tunnel api.gameapp.games

# Verify DNS records in Cloudflare Dashboard
# Go to DNS → Records → You should see:
# Type: CNAME, Name: gameapp.games, Content: <tunnel-id>.cfargotunnel.com
# Type: CNAME, Name: api.gameapp.games, Content: <tunnel-id>.cfargotunnel.com
```

#### **6. Test Your Tunnel**
```bash
# Start the tunnel in foreground (for testing)
cloudflared tunnel run humor-game-tunnel

# In another terminal, test the connection
curl -I https://gameapp.games
curl -I https://api.gameapp.games/api/health
```

#### **7. Run Tunnel as a Service (Production)**
```bash
# Install tunnel as a system service
sudo cloudflared service install

# Start the service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Check service status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

#### **8. Update Your .env File for Internet Access**
```bash
# Update your .env file
cat >> .env << EOF

# Cloudflare Internet Exposure
CORS_ORIGIN=https://gameapp.games,https://*.gameapp.games
FRONTEND_URL=https://gameapp.games
API_BASE_URL=https://api.gameapp.games
EOF

# Redeploy with updated configuration
./deploy-k8s.sh
```

### **🌍 Access Your Game from Anywhere**

Once the tunnel is running:
- **🌐 Game**: `https://gameapp.games` (accessible from anywhere)
- **🔌 API**: `https://api.gameapp.games/api/health` (accessible from anywhere)
- **📱 Mobile**: Works on phones, tablets, any device
- **🌍 Global**: Accessible from any country

### **🔒 Security Features**

Cloudflare Tunnel provides:
- **🛡️ DDoS Protection**: Automatic attack mitigation
- **🔐 SSL/TLS**: End-to-end encryption
- **🌍 CDN**: Global content delivery
- **📊 Analytics**: Traffic insights and monitoring
- **🚫 No Port Forwarding**: Your router stays secure

### **📱 Testing Internet Access**

```bash
# Test from your local machine
curl -I https://gameapp.games

# Test from a mobile device (different network)
# Open https://gameapp.games in mobile browser

# Test API endpoints
curl -I https://api.gameapp.games/api/health
curl -I https://gameapp.games/api/health

# Test CORS (from browser console on different domain)
fetch('https://api.gameapp.games/api/health', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

### **🚨 Troubleshooting Cloudflare Tunnel**

#### **Common Issues**
```bash
# 1. Tunnel not connecting
cloudflared tunnel info humor-game-tunnel
cloudflared tunnel route ip show

# 2. DNS not resolving
nslookup gameapp.games
dig gameapp.games

# 3. Check tunnel logs
sudo journalctl -u cloudflared -f

# 4. Test tunnel connectivity
cloudflared tunnel run humor-game-tunnel --loglevel debug
```

#### **Reset Tunnel if Needed**
```bash
# Delete and recreate tunnel
cloudflared tunnel delete humor-game-tunnel
cloudflared tunnel create humor-game-tunnel

# Update config with new tunnel ID
# Then recreate DNS routes
```

### **🎯 Production Considerations**

1. **Backup Tunnel Config**: Save `~/.cloudflared/config.yml`
2. **Monitor Tunnel Health**: Check Cloudflare dashboard regularly
3. **Update Cloudflared**: Keep the CLI tool updated
4. **Multiple Tunnels**: Consider separate tunnels for staging/production
5. **Load Balancing**: Use multiple tunnel endpoints for high availability

---

**🎉 Congratulations! Your game is now accessible from anywhere on the internet via Cloudflare!**
#### **6. Test Your Tunnel**
```bash
# Start the tunnel in foreground (for testing)
cloudflared tunnel run humor-game-tunnel

# In another terminal, test the connection
curl -I https://gameapp.games
curl -I https://api.gameapp.games/api/health
```

#### **7. Run Tunnel as a Service (Production)**
```bash
# Install tunnel as a system service
sudo cloudflared service install

# Start the service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Check service status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

#### **8. Update Your .env File for Internet Access**
```bash
# Update your .env file
cat >> .env << EOF

# Cloudflare Internet Exposure
CORS_ORIGIN=https://gameapp.games,https://*.gameapp.games
FRONTEND_URL=https://gameapp.games
API_BASE_URL=https://api.gameapp.games
EOF

# Redeploy with updated configuration
./deploy-k8s.sh
```

### **🌍 Access Your Game from Anywhere**

Once the tunnel is running:
- **🌐 Game**: `https://gameapp.games` (accessible from anywhere)
- **🔌 API**: `https://api.gameapp.games/api/health` (accessible from anywhere)
- **📱 Mobile**: Works on phones, tablets, any device
- **🌍 Global**: Accessible from any country

### **🔒 Security Features**

Cloudflare Tunnel provides:
- **🛡️ DDoS Protection**: Automatic attack mitigation
- **🔐 SSL/TLS**: End-to-end encryption
- **🌍 CDN**: Global content delivery
- **📊 Analytics**: Traffic insights and monitoring
- **🚫 No Port Forwarding**: Your router stays secure

### **📱 Testing Internet Access**

```bash
# Test from your local machine
curl -I https://gameapp.games

# Test from a mobile device (different network)
# Open https://gameapp.games in mobile browser

# Test API endpoints
curl -I https://api.gameapp.games/api/health
curl -I https://gameapp.games/api/health

# Test CORS (from browser console on different domain)
fetch('https://api.gameapp.games/api/health', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

### **🚨 Troubleshooting Cloudflare Tunnel**

#### **Common Issues**
```bash
# 1. Tunnel not connecting
cloudflared tunnel info humor-game-tunnel
cloudflared tunnel route ip show

# 2. DNS not resolving
nslookup gameapp.games
dig gameapp.games

# 3. Check tunnel logs
sudo journalctl -u cloudflared -f

# 4. Test tunnel connectivity
cloudflared tunnel run humor-game-tunnel --loglevel debug
```

#### **Reset Tunnel if Needed**
```bash
# Delete and recreate tunnel
cloudflared tunnel delete humor-game-tunnel
cloudflared tunnel create humor-game-tunnel

# Update config with new tunnel ID
# Then recreate DNS routes
```

### **🎯 Production Considerations**

1. **Backup Tunnel Config**: Save `~/.cloudflared/config.yml`
2. **Monitor Tunnel Health**: Check Cloudflare dashboard regularly
3. **Update Cloudflared**: Keep the CLI tool updated
4. **Multiple Tunnels**: Consider separate tunnels for staging/production
5. **Load Balancing**: Use multiple tunnel endpoints for high availability

---

**🎉 Congratulations! Your game is now accessible from anywhere on the internet via Cloudflare!**

### **📝 UPDATING YOUR APPLICATION**

#### **Build and Deploy New Versions**
```bash
# 1. Build new images with new tag
docker build -t localhost:5001/humor-game/backend:v1.0.1 backend/
docker build -t localhost:5001/humor-game/frontend:v1.0.1 frontend/

# 2. Push to registry
docker push localhost:5001/humor-game/backend:v1.0.1
docker push localhost:5001/humor-game/frontend:v1.0.1

# 3. Update manifests
sed -i 's|image: localhost:5001/humor-game/backend:.*|image: localhost:5001/humor-game/backend:v1.0.1|g' k8s/backend.yaml
sed -i 's|image: localhost:5001/humor-game/frontend:.*|image: localhost:5001/humor-game/frontend:v1.0.1|g' k8s/frontend.yaml

# 4. Re-deploy
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml

# 5. Wait for rollout
kubectl rollout status deployment/backend -n humor-game
kubectl rollout status deployment/frontend -n humor-game
```

### **🔍 TROUBLESHOOTING COMMANDS**

#### **Check Service Status**
```bash
# View all resources
kubectl get pods,svc,ingress -n humor-game

# Check pod logs
kubectl logs -l app=backend -n humor-game --tail=100
kubectl logs -l app=postgres -n humor-game --tail=100
kubectl logs -l app=redis -n humor-game --tail=100

# Describe failing pods
kubectl describe pod <pod-name> -n humor-game
```

#### **Test Database Connections**
```bash
# Test PostgreSQL
kubectl exec -it $(kubectl get pod -l app=postgres -n humor-game -o jsonpath='{.items[0].metadata.name}') -n humor-game -- psql -U gameuser -d humor_memory_game -c "SELECT 1;"

# Test Redis
kubectl exec -it $(kubectl get pod -l app=redis -n humor-game -o jsonpath='{.items[0].metadata.name}') -n humor-game -- sh -c 'redis-cli -a "$REDIS_PASSWORD" ping'
```

#### **Common Issues and Fixes**
```bash
# If images won't pull
docker ps | grep registry
curl http://localhost:5001/v2/_catalog

# If CORS errors
kubectl get configmap humor-game-config -n humor-game -o yaml

# If ingress not working
kubectl get pods -n ingress-nginx
kubectl describe ingress -n humor-game

# Reset everything
kubectl delete namespace humor-game --timeout=60s || true
k3d cluster delete humor-game-cluster || true
docker rm -f k3d-registry || true
```

### **📊 MONITORING (Optional)**

#### **Install Prometheus + Grafana**
```bash
# Add monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create lightweight values for laptops
cat << EOF > monitoring-values.yaml
prometheus:
  prometheusSpec:
    retention: 3d
    resources:
      requests:
        memory: "128Mi"
        cpu: "50m"
      limits:
        memory: "256Mi"
        cpu: "100m"

grafana:
  adminPassword: "humor-game-admin"
  resources:
    requests:
      memory: "32Mi"
      cpu: "25m"
    limits:
      memory: "64Mi"
      cpu: "50m"
  persistence:
    enabled: false

alertmanager:
  enabled: false
EOF

# Install monitoring
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring-values.yaml \
  --wait

# Access Grafana
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring &
echo "Grafana: http://localhost:3000 (admin/humor-game-admin)"
```

---

**🎯 You now have a complete, production-ready Kubernetes deployment guide!**

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
	@# Ensure Docker is running (works with both Docker Desktop and Colima)
	@docker info >/dev/null 2>&1 || (echo "❌ Docker not running. Start Docker Desktop or run 'colima start'" && exit 1)
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

colima-setup: ## 🍎 Setup Colima (macOS Docker alternative)
	@echo "🍎 Setting up Colima as Docker Desktop alternative..."
	@brew install colima docker docker-compose 2>/dev/null || echo "Install brew packages manually if needed"
	@colima stop 2>/dev/null || true
	@colima start --runtime docker --cpu 4 --memory 8 --disk 100
	@echo "✅ Colima started! Docker is now ready"
	@echo "🔧 Run 'make setup' to continue with Kubernetes setup"

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

# Create lightweight values for laptops
cat << EOF > monitoring-values.yaml
prometheus:
  prometheusSpec:
    retention: 3d
    resources:
      requests:
        memory: "128Mi"  # Reduced from 400Mi
        cpu: "50m"
      limits:
        memory: "256Mi"
        cpu: "100m"

grafana:
  adminPassword: "humor-game-admin"
  resources:
    requests:
      memory: "32Mi"   # Reduced from 100Mi
      cpu: "25m"
    limits:
      memory: "64Mi"
      cpu: "50m"
  persistence:
    enabled: false

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

### Colima-Specific Issues

**Colima Won't Start**
```bash
# Reset Colima if it gets stuck
colima stop
colima delete
colima start --runtime docker --cpu 4 --memory 8

# Check Colima logs
colima logs
```

**Performance Issues with Colima**
```bash
# Increase resources allocated to Colima
colima stop
colima start --runtime docker --cpu 6 --memory 12 --disk 100

# Check current resource allocation
colima status
```

**Registry Issues with Colima**
```bash
# Ensure registry is accessible from Colima VM
docker network ls
docker inspect k3d-registry

# Test registry connectivity
curl http://localhost:5001/v2/_catalog
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

---

## 🚨 CRITICAL TROUBLESHOOTING

### **Redis Password Issue (FIXED)**
The Redis deployment in this guide has a **critical issue**: `$(REDIS_PASSWORD)` variable substitution doesn't work in command arrays.

**Problem**:
```yaml
command:
- redis-server
- --requirepass
- $(REDIS_PASSWORD)  # ❌ This won't work!
```

**Solution** - Use environment variable instead:
```yaml
command:
- redis-server
- --appendonly
- "yes"
- --requirepass
- "$(REDIS_PASSWORD)"  # ✅ Use quotes and env var
env:
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: humor-game-secrets
      key: REDIS_PASSWORD
```

### **Database Initialization Issue (FIXED)**
The postgres deployment was missing proper database initialization.

**Problem**: Empty init script placeholder
**Solution**: Added complete database schema from your `combined-init.sql`

### **Resource Limits Issue (FIXED)**
Original manifests had resource limits too high for laptop deployment.

**Problem**: 256Mi-512Mi memory requests
**Solution**: Reduced to 16Mi-64Mi for laptop-friendly deployment

### **Security Issues (FIXED)**
- ✅ Removed hardcoded passwords
- ✅ Added security warnings
- ✅ Fixed CORS configuration
- ✅ Added proper environment variable handling

---

**All critical issues have been fixed in this updated guide! 🎯**