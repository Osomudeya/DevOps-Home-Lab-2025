# From Laptop to Production: Kubernetes + DevOps Home Lab (2025 Edition)

*Zero cloud costs. Full production pipeline. Your laptop only.*

---

## Table of Contents

1. [Why This Lab (2025)](#1-why-this-lab-2025)
2. [Prerequisites (Copy–Paste)](#2-prerequisites-copy-paste)
3. [Cluster in 60 Seconds (k3d + Registry)](#3-cluster-in-60-seconds-k3d--registry)
4. [Ingress + TLS](#4-ingress--tls)
5. [App Deployment (FE + BE + Postgres)](#5-app-deployment-fe--be--postgres)
6. [Automation I — Dev Loop](#6-automation-i--dev-loop)
7. [Observability (5 min)](#7-observability-5-min)
8. [GitOps with ArgoCD (Local)](#8-gitops-with-argocd-local)
9. [Automation II — CI on Your Laptop](#9-automation-ii--ci-on-your-laptop)
10. [Secure Public URL (No Router Changes)](#10-secure-public-url-no-router-changes)

**Appendices:**
- [VM vs No VM](#appendix-a-vm-vs-no-vm)
- [Kustomize Structure](#appendix-b-kustomize-structure)
- [Backup & Jobs](#appendix-c-backup--jobs)
- [Common Fixes](#appendix-d-common-fixes)

---

## 1. Why This Lab (2025)

**The Problem:** Cloud labs cost money. VMs are slow. Most tutorials skip automation.

**The Solution:** k3d runs Kubernetes in Docker containers on your laptop. Add GitOps, CI/CD, observability, and secure tunneling — you get a production-grade pipeline that costs $0/month.

### What You'll Build

- **Local Kubernetes cluster** (k3d) with ingress + TLS
- **Full-stack app** (Frontend + Backend + Postgres)
- **GitOps pipeline** (ArgoCD auto-deploys from Git)
- **CI/CD automation** (GitHub Actions on your machine)
- **Observability stack** (Prometheus + Grafana)
- **Secure public access** (Cloudflare Tunnel)

### Tools Stack

| Component | Tool | Why |
|-----------|------|-----|
| Kubernetes | k3d | Lightweight, fast startup |
| Container Registry | Docker Registry | Local, no auth needed |
| Ingress | ingress-nginx | Industry standard |
| TLS | mkcert | Trusted local certificates |
| GitOps | ArgoCD | Pull-based deployments |
| CI/CD | GitHub Actions (self-hosted) | Runs on your machine |
| Monitoring | kube-prometheus-stack | Complete observability |
| Secure Tunnel | Cloudflare Tunnel | No port forwarding |

### Key Advantages

- **No VM overhead** — Docker Desktop handles virtualization
- **Fast iteration** — Build, push, deploy in seconds
- **Real GitOps** — Just like production teams use
- **Secure by default** — TLS everywhere, Zero Trust access
- **Automation-first** — Every step is scriptable

---

## 2. Prerequisites (Copy–Paste)

### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install tools
brew install docker docker-compose kubectl helm git
brew install k3d mkcert cloudflared
```

### Windows (WSL2)

```bash
# In WSL2 Ubuntu terminal
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update && sudo apt-get install helm

# Install k3d
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Install mkcert
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Linux (Ubuntu/Debian)

Same as Windows WSL2 commands above.

### Version Check

```bash
docker --version          # Docker version 24.0.0+
k3d --version             # k3d version v5.6.0+
kubectl version --client  # Client Version: v1.28.0+
helm version              # Version:"v3.13.0"+
mkcert -version           # v1.4.4+
cloudflared --version     # cloudflared version 2023.8.0+
git --version             # git version 2.40.0+
```

**✅ Checkpoint:** All commands return version numbers without errors.

---

## 3. Cluster in 60 Seconds (k3d + Registry)

### Create Local Registry

```bash
# Start local Docker registry
docker run -d --restart=always -p 5001:5000 --name k3d-registry registry:2
```

### Create k3d Cluster

```bash
# Create cluster config
cat << EOF > k3d-config.yaml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: devlab
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

# Create cluster
k3d cluster create --config k3d-config.yaml

# Update kubeconfig
k3d kubeconfig merge devlab --kubeconfig-switch-context
```

### Verify Cluster

```bash
kubectl get nodes
kubectl get pods -A
kubectl cluster-info
```

**Expected Output:**
```
NAME                   STATUS   ROLES                  AGE   VERSION
k3d-devlab-server-0    Ready    control-plane,master   30s   v1.28.2+k3s1
k3d-devlab-agent-0     Ready    <none>                 25s   v1.28.2+k3s1
k3d-devlab-agent-1     Ready    <none>                 25s   v1.28.2+k3s1
```

**✅ Checkpoint:** `kubectl get nodes` shows 3 ready nodes.

---

## 4. Ingress + TLS

### Install ingress-nginx

```bash
# Add Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install with custom values
cat << EOF > ingress-values.yaml
controller:
  service:
    type: NodePort
    nodePorts:
      http: 30080
      https: 30443
  hostNetwork: true
  hostPort:
    enabled: true
    ports:
      http: 80
      https: 443
EOF

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  -f ingress-values.yaml
```

### Generate TLS Certificates

```bash
# Install CA in system trust store
mkcert -install

# Generate certificates for local domains
mkcert "*.local.test" "*.127.0.0.1.sslip.io" localhost 127.0.0.1

# Create Kubernetes secret
kubectl create secret tls local-tls \
  --cert=_wildcard.local.test+3.pem \
  --key=_wildcard.local.test+3-key.pem
```

### Test Ingress

```bash
# Create test deployment
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80

# Create test ingress
cat << EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
spec:
  tls:
  - hosts:
    - app.local.test
    secretName: local-tls
  rules:
  - host: app.local.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx
            port:
              number: 80
EOF

# Add to /etc/hosts
echo "127.0.0.1 app.local.test" | sudo tee -a /etc/hosts
```

**✅ Checkpoint:** Open `https://app.local.test` — see nginx welcome page with valid TLS.

---

## 5. App Deployment (FE + BE + Postgres)

### Sample Application Structure

```
app/
├── frontend/
│   ├── Dockerfile
│   └── src/index.html
├── backend/
│   ├── Dockerfile
│   └── src/main.py
└── k8s/
    ├── namespace.yaml
    ├── postgres.yaml
    ├── backend.yaml
    ├── frontend.yaml
    └── ingress.yaml
```

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM nginx:alpine
COPY src /usr/share/nginx/html
EXPOSE 80
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY src/ .
EXPOSE 8000
CMD ["python", "main.py"]
```

### Build and Push Images

```bash
# Build frontend
cd frontend
docker build -t localhost:5001/app/frontend:v1.0.0 .
docker push localhost:5001/app/frontend:v1.0.0

# Build backend
cd ../backend
docker build -t localhost:5001/app/backend:v1.0.0 .
docker push localhost:5001/app/backend:v1.0.0
```

### Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
---
# k8s/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: myapp
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
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: "appdb"
        - name: POSTGRES_USER
          value: "appuser"
        - name: POSTGRES_PASSWORD
          value: "apppass"
        ports:
        - containerPort: 5432
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - appuser
            - -d
            - appdb
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: myapp
spec:
  ports:
  - port: 5432
  selector:
    app: postgres
---
# k8s/backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: myapp
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
        image: localhost:5001/app/backend:v1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "postgresql://appuser:apppass@postgres:5432/appdb"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: myapp
spec:
  ports:
  - port: 8000
  selector:
    app: backend
---
# k8s/frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: myapp
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
        image: localhost:5001/app/frontend:v1.0.0
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
  namespace: myapp
spec:
  ports:
  - port: 80
  selector:
    app: frontend
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: myapp
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  tls:
  - hosts:
    - myapp.local.test
    secretName: local-tls
  rules:
  - host: myapp.local.test
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### Deploy Application

```bash
# Copy TLS secret to app namespace
kubectl get secret local-tls -o yaml | \
  sed 's/namespace: default/namespace: myapp/' | \
  kubectl apply -f -

# Deploy all manifests
kubectl apply -f k8s/

# Add domain to /etc/hosts
echo "127.0.0.1 myapp.local.test" | sudo tee -a /etc/hosts

# Wait for pods
kubectl wait --for=condition=ready pod -l app=postgres -n myapp --timeout=60s
kubectl wait --for=condition=ready pod -l app=backend -n myapp --timeout=60s
kubectl wait --for=condition=ready pod -l app=frontend -n myapp --timeout=60s
```

**✅ Checkpoint:** `kubectl get pods -n myapp` shows all pods Running. Open `https://myapp.local.test` to see your app.

---

## 6. Automation I — Dev Loop

### Makefile

```makefile
# Makefile
.PHONY: build push deploy logs restart status clean

REGISTRY := localhost:5001
APP := myapp
VERSION := $(shell git rev-parse --short HEAD)
NAMESPACE := myapp

build:
	@echo "Building frontend..."
	docker build -t $(REGISTRY)/$(APP)/frontend:$(VERSION) frontend/
	@echo "Building backend..."
	docker build -t $(REGISTRY)/$(APP)/backend:$(VERSION) backend/

push: build
	@echo "Pushing images..."
	docker push $(REGISTRY)/$(APP)/frontend:$(VERSION)
	docker push $(REGISTRY)/$(APP)/backend:$(VERSION)

deploy: push
	@echo "Updating manifests with new version..."
	sed -i.bak 's|image: $(REGISTRY)/$(APP)/frontend:.*|image: $(REGISTRY)/$(APP)/frontend:$(VERSION)|g' k8s/frontend.yaml
	sed -i.bak 's|image: $(REGISTRY)/$(APP)/backend:.*|image: $(REGISTRY)/$(APP)/backend:$(VERSION)|g' k8s/backend.yaml
	@echo "Applying manifests..."
	kubectl apply -f k8s/
	@echo "Waiting for rollout..."
	kubectl rollout status deployment/frontend -n $(NAMESPACE)
	kubectl rollout status deployment/backend -n $(NAMESPACE)

logs:
	kubectl logs -f -l app=backend -n $(NAMESPACE) --tail=50

restart:
	kubectl rollout restart deployment/frontend -n $(NAMESPACE)
	kubectl rollout restart deployment/backend -n $(NAMESPACE)

status:
	kubectl get pods -n $(NAMESPACE)
	kubectl get svc -n $(NAMESPACE)
	kubectl get ingress -n $(NAMESPACE)

clean:
	kubectl delete namespace $(NAMESPACE)
	k3d cluster delete devlab
	docker rm -f k3d-registry
```

### Taskfile Alternative (Optional)

```yaml
# Taskfile.yml
version: '3'

vars:
  REGISTRY: localhost:5001
  APP: myapp
  VERSION:
    sh: git rev-parse --short HEAD
  NAMESPACE: myapp

tasks:
  build:
    desc: Build Docker images
    cmds:
      - docker build -t {{.REGISTRY}}/{{.APP}}/frontend:{{.VERSION}} frontend/
      - docker build -t {{.REGISTRY}}/{{.APP}}/backend:{{.VERSION}} backend/

  push:
    desc: Push images to registry
    deps: [build]
    cmds:
      - docker push {{.REGISTRY}}/{{.APP}}/frontend:{{.VERSION}}
      - docker push {{.REGISTRY}}/{{.APP}}/backend:{{.VERSION}}

  deploy:
    desc: Deploy to Kubernetes
    deps: [push]
    cmds:
      - sed -i.bak 's|image: {{.REGISTRY}}/{{.APP}}/frontend:.*|image: {{.REGISTRY}}/{{.APP}}/frontend:{{.VERSION}}|g' k8s/frontend.yaml
      - sed -i.bak 's|image: {{.REGISTRY}}/{{.APP}}/backend:.*|image: {{.REGISTRY}}/{{.APP}}/backend:{{.VERSION}}|g' k8s/backend.yaml
      - kubectl apply -f k8s/
      - kubectl rollout status deployment/frontend -n {{.NAMESPACE}}
      - kubectl rollout status deployment/backend -n {{.NAMESPACE}}
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat << 'EOF' > .pre-commit-config.yaml
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
        
  - repo: local
    hooks:
      - id: kubectl-validate
        name: Validate Kubernetes manifests
        entry: bash -c 'kubectl kustomize --load-restrictor=LoadRestrictionsNone k8s/ | kubectl apply --dry-run=client -f -'
        language: system
        files: '^k8s/.*\.yaml$'
        pass_filenames: false
EOF

# Create yamllint config
cat << 'EOF' > .yamllint.yml
extends: default
rules:
  line-length:
    max: 120
  indentation:
    spaces: 2
EOF

# Install hooks
pre-commit install
```

**✅ Checkpoint:** Run `make build push deploy` — app updates with new image tag. Pre-commit hooks prevent broken YAML.

---

## 7. Observability (5 min)

### Install kube-prometheus-stack

```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create values file for minimal resources
cat << EOF > monitoring-values.yaml
prometheus:
  prometheusSpec:
    resources:
      requests:
        memory: "200Mi"
        cpu: "100m"
      limits:
        memory: "400Mi"
        cpu: "200m"
    retention: "7d"
    retentionSize: "1GB"

grafana:
  resources:
    requests:
      memory: "100Mi"
      cpu: "50m"
    limits:
      memory: "200Mi"
      cpu: "100m"
  persistence:
    enabled: false

alertmanager:
  enabled: false

kubeStateMetrics:
  resources:
    requests:
      memory: "50Mi"
      cpu: "25m"
    limits:
      memory: "100Mi"
      cpu: "50m"

nodeExporter:
  resources:
    requests:
      memory: "30Mi"
      cpu: "25m"
    limits:
      memory: "50Mi"
      cpu: "50m"
EOF

# Install monitoring stack
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f monitoring-values.yaml
```

### Access Grafana

```bash
# Wait for pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n monitoring --timeout=120s

# Get admin password
kubectl get secret --namespace monitoring monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

# Port forward Grafana
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring &

# Open browser
echo "Open http://localhost:3000"
echo "Username: admin"
echo "Password: $(kubectl get secret --namespace monitoring monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 --decode)"
```

### Key Dashboards

1. **Kubernetes / Compute Resources / Cluster** — Overall cluster health
2. **Kubernetes / Compute Resources / Namespace (Pods)** — Pod resource usage
3. **Kubernetes / Compute Resources / Pod** — Individual pod metrics
4. **Node Exporter / Nodes** — Host system metrics

### Custom Dashboard for Your App

```bash
# Create custom dashboard ConfigMap
cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  myapp-dashboard.json: |
    {
      "dashboard": {
        "title": "MyApp Dashboard",
        "panels": [
          {
            "title": "Frontend Pods",
            "targets": [
              {
                "expr": "up{job=\"kubernetes-pods\",kubernetes_namespace=\"myapp\",kubernetes_pod_label_app=\"frontend\"}"
              }
            ]
          },
          {
            "title": "Backend Response Time",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"kubernetes-pods\",kubernetes_namespace=\"myapp\"}[5m]))"
              }
            ]
          }
        ]
      }
    }
EOF
```

**✅ Checkpoint:** Access Grafana at `http://localhost:3000`, see CPU/memory metrics for your app pods in pre-built dashboards.

---

## 8. GitOps with ArgoCD (Local)

### Install ArgoCD

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for deployment
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=180s
```

### Access ArgoCD UI

```bash
# Get admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD Password: $ARGOCD_PASSWORD"

# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Login via CLI (optional)
argocd login localhost:8080 --username admin --password $ARGOCD_PASSWORD --insecure
```

### Prepare Git Repository

```bash
# Create GitOps repo structure
mkdir myapp-gitops && cd myapp-gitops
git init

# Create kustomization structure
mkdir -p apps/myapp/base apps/myapp/overlays/dev

# Base kustomization
cat << 'EOF' > apps/myapp/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../k8s/namespace.yaml
  - ../../k8s/postgres.yaml
  - ../../k8s/backend.yaml
  - ../../k8s/frontend.yaml
  - ../../k8s/ingress.yaml

images:
  - name: localhost:5001/myapp/frontend
    newTag: v1.0.0
  - name: localhost:5001/myapp/backend
    newTag: v1.0.0
EOF

# Dev overlay
cat << 'EOF' > apps/myapp/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patchesStrategicMerge:
  - replica-patch.yaml
EOF

cat << 'EOF' > apps/myapp/overlays/dev/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: myapp
spec:
  replicas: 1
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: myapp
spec:
  replicas: 1
EOF

# Copy K8s manifests
cp -r ../k8s .

# Commit
git add .
git commit -m "Initial GitOps setup"
```

### Create ArgoCD Application

```yaml
# Create application.yaml
cat << 'EOF' | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: file:///tmp/myapp-gitops  # Local path for demo
    targetRevision: HEAD
    path: apps/myapp/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF
```

### Test GitOps Flow

```bash
# Update image tag in Git
cd myapp-gitops
sed -i 's/newTag: v1.0.0/newTag: v1.0.1/g' apps/myapp/base/kustomization.yaml
git add . && git commit -m "Update to v1.0.1"

# ArgoCD will detect change and sync automatically within 3 minutes
# Force immediate sync via CLI:
argocd app sync myapp
```

**✅ Checkpoint:** Change image tag in Git → ArgoCD detects → app updates automatically. View sync status in ArgoCD UI at `https://localhost:8080`.

---

## 9. Automation II — CI on Your Laptop

### Self-hosted GitHub Actions Runner

```bash
# Create runner directory
mkdir actions-runner && cd actions-runner

# Download runner (Linux/macOS)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure runner (get token from GitHub repo settings)
./config.sh --url https://github.com/yourusername/myapp --token YOUR_RUNNER_TOKEN

# Run as service
sudo ./svc.sh install
sudo ./svc.sh start
```

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: self-hosted
    steps:
    - uses: actions/checkout@v4
    
    - name: Lint YAML files
      run: yamllint k8s/
      
    - name: Lint Dockerfiles
      uses: hadolint/hadolint-action@v3.1.0
      with:
        dockerfile: frontend/Dockerfile
        
    - name: Validate K8s manifests
      run: |
        kubectl kustomize --load-restrictor=LoadRestrictionsNone k8s/ | \
        kubectl apply --dry-run=client -f -

  security:
    runs-on: self-hosted
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
        
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  build-and-deploy:
    needs: [lint, security]
    runs-on: self-hosted
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
        
    - name: Generate version
      id: version
      run: echo "VERSION=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      
    - name: Build and push images
      env:
        VERSION: ${{ steps.version.outputs.VERSION }}
      run: |
        docker build -t localhost:5001/myapp/frontend:$VERSION frontend/
        docker build -t localhost:5001/myapp/backend:$VERSION backend/
        docker push localhost:5001/myapp/frontend:$VERSION
        docker push localhost:5001/myapp/backend:$VERSION
        
    - name: Update manifests
      env:
        VERSION: ${{ steps.version.outputs.VERSION }}
      run: |
        sed -i "s|newTag: .*|newTag: $VERSION|g" apps/myapp/base/kustomization.yaml
        
    - name: Commit updated manifests
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add apps/myapp/base/kustomization.yaml
        git commit -m "Update images to ${{ steps.version.outputs.VERSION }}" || exit 0
        git push
```

### ArgoCD Image Updater

```bash
# Install ArgoCD Image Updater
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/manifests/install.yaml

# Annotate application for auto-update
kubectl patch application myapp -n argocd --type='merge' -p='{
  "metadata": {
    "annotations": {
      "argocd-image-updater.argoproj.io/image-list": "frontend=localhost:5001/myapp/frontend,backend=localhost:5001/myapp/backend",
      "argocd-image-updater.argoproj.io/write-back-method": "git",
      "argocd-image-updater.argoproj.io/git-branch": "main"
    }
  }
}'
```

### Renovate for Dependencies

```json
{
  "extends": ["config:base"],
  "dockerfile": {
    "enabled": true
  },
  "kubernetes": {
    "enabled": true,
    "fileMatch": ["k8s/.+\\.yaml$"]
  },
  "regexManagers": [
    {
      "fileMatch": ["k8s/.+\\.yaml$"],
      "matchStrings": ["image: (?<depName>.*):(?<currentValue>.*?)\\n"],
      "datasourceTemplate": "docker"
    }
  ]
}
```

**✅ Checkpoint:** Push to main → GitHub Actions builds/pushes → ArgoCD deploys automatically. Security scans fail if vulnerabilities found.

---

## 10. Secure Public URL (No Router Changes)

### Install Cloudflare Tunnel

```bash
# Login to Cloudflare (opens browser)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create homelab

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep homelab | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# Create tunnel config
cat << EOF > ~/.cloudflared/config.yml
tunnel: homelab
credentials-file: ~/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: myapp.yourdomain.com
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF
```

### DNS Setup

```bash
# Create DNS record (replace yourdomain.com)
cloudflared tunnel route dns homelab myapp.yourdomain.com
```

### Run Tunnel

```bash
# Test tunnel
cloudflared tunnel run homelab

# Install as service (Linux/macOS)
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Verify tunnel status
cloudflared tunnel info homelab
```

### Zero Trust Access (Optional)

```bash
# Create Zero Trust policy via Cloudflare dashboard:
# 1. Access → Applications → Add Application
# 2. Domain: myapp.yourdomain.com  
# 3. Policy: Emails ending in @yourcompany.com
# 4. Save
```

### Test Public Access

```bash
# Update ingress to use public domain
cat << EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress-public
  namespace: myapp
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  tls:
  - hosts:
    - myapp.yourdomain.com
    secretName: local-tls
  rules:
  - host: myapp.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
EOF
```

**✅ Checkpoint:** Open `https://myapp.yourdomain.com` from anywhere — secure access to your laptop app with Cloudflare's TLS certificate.

---

## Appendix A: VM vs No VM

### Default Approach: No Manual VM

**k3d + Docker Desktop** is the fastest path:
- Docker Desktop handles VM abstraction automatically
- k3d creates Kubernetes in lightweight containers
- Near-native performance on all platforms
- Easy cleanup: `k3d cluster delete` removes everything

### When to Use a Full VM

Consider a real VM with kubeadm if you need:
- **Kernel features** — eBPF, custom network policies, raw block devices
- **On-prem simulation** — Multiple real nodes, cluster-level operations
- **Advanced storage** — Ceph, distributed filesystems that need raw disks

### Apple Silicon VM Options

VirtualBox doesn't support ARM64. Use instead:

```bash
# Lima (recommended)
brew install lima
limactl start --name=k8s template://k8s

# Colima
brew install colima
colima start --runtime containerd --kubernetes

# UTM (GUI)
# Download from Mac App Store
# Create Ubuntu ARM64 VM manually
```

---

## Appendix B: Kustomize Structure

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── postgres.yaml
│   ├── backend.yaml
│   ├── frontend.yaml
│   └── ingress.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── replica-patch.yaml
    ├── staging/
    │   ├── kustomization.yaml
    │   ├── replica-patch.yaml
    │   └── ingress-patch.yaml
    └── prod/
        ├── kustomization.yaml
        ├── replica-patch.yaml
        ├── resource-patch.yaml
        └── hpa.yaml
```

### Base Kustomization

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml
  - postgres.yaml
  - backend.yaml
  - frontend.yaml
  - ingress.yaml

images:
  - name: localhost:5001/myapp/frontend
    newTag: latest
  - name: localhost:5001/myapp/backend
    newTag: latest

commonLabels:
  app.kubernetes.io/name: myapp
  app.kubernetes.io/version: v1.0.0
```

### Environment Overlays

```yaml
# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patchesStrategicMerge:
  - replica-patch.yaml
  - resource-patch.yaml

resources:
  - hpa.yaml

replicas:
  - name: frontend
    count: 3
  - name: backend
    count: 5
```

---

## Appendix C: Backup & Jobs

### Postgres Backup CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: myapp
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15
            env:
            - name: PGPASSWORD
              value: "apppass"
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="/backups/backup-$(date +%Y%m%d-%H%M%S).sql"
              pg_dump -h postgres -U appuser -d appdb > $BACKUP_FILE
              echo "Backup created: $BACKUP_FILE"
              # Keep only last 7 days
              find /backups -name "backup-*.sql" -mtime +7 -delete
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-pvc
  namespace: myapp
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

### Application Health Check Job

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: health-check
  namespace: myapp
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: health-check
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              if ! curl -f -s https://myapp.local.test/health > /dev/null; then
                echo "Health check failed at $(date)"
                exit 1
              fi
              echo "Health check passed at $(date)"
          restartPolicy: OnFailure
```

---

## Appendix D: Common Fixes

### ImagePullBackOff

```bash
# Check if registry is running
docker ps | grep registry

# Test registry connectivity from cluster
kubectl run test --image=busybox -it --rm -- nslookup k3d-registry

# Verify image exists
curl http://localhost:5001/v2/_catalog
curl http://localhost:5001/v2/myapp/frontend/tags/list
```

### Ingress 404 Errors

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress app-ingress -n myapp

# Check service endpoints
kubectl get endpoints -n myapp

# Check if host is in /etc/hosts
grep "myapp.local.test" /etc/hosts
```

### TLS Certificate Issues

```bash
# Regenerate certificates
rm -f *.pem
mkcert "*.local.test" "*.127.0.0.1.sslip.io" localhost 127.0.0.1

# Update secret
kubectl delete secret local-tls
kubectl create secret tls local-tls \
  --cert=_wildcard.local.test+3.pem \
  --key=_wildcard.local.test+3-key.pem
```

### NodePort vs LoadBalancer

k3d doesn't support LoadBalancer type services. Use NodePort instead:

```yaml
# Wrong
spec:
  type: LoadBalancer
  ports:
  - port: 80

# Correct
spec:
  type: NodePort
  ports:
  - port: 80
    nodePort: 30080
```

### Resource Limits

If pods are OOMKilled, increase limits:

```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "256Mi"    # Increased
    cpu: "200m"        # Increased
```

### Quick Cluster Reset

```bash
# Nuclear option - start fresh
make clean
k3d cluster delete devlab
docker rm -f k3d-registry
docker system prune -f

# Rebuild everything
make build push deploy
```

---

**🎉 Congratulations!** You now have a complete Kubernetes + DevOps pipeline running on your laptop. This setup mirrors production environments used by engineering teams worldwide — GitOps, automated CI/CD, observability, and secure access — all for $0/month.