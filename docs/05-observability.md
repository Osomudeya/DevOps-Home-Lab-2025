# Kubernetes Monitoring: Track Performance Like a Pro

*Set up production-grade monitoring with Prometheus and Grafana to catch issues before they become problems*

## 🎯 **What You'll Learn**

By the end of this tutorial, you'll know how to:
- **Collect metrics** from your Kubernetes applications
- **Create dashboards** to visualize performance data
- **Set up alerts** to catch issues early
- **Monitor resource usage** (CPU, memory, disk)
- **Track application health** in real-time

## ⏱️ **Time Required: 45-90 minutes**

## Why This Matters

Monitoring isn't optional in production. This tutorial teaches you the same observability patterns used by companies like Datadog and New Relic to track application performance and prevent outages before they happen.

**What this means for you**: Professional DevOps engineers spend 30% of their time on monitoring. Learning these tools makes you valuable to any team that runs production applications.

ℹ️ **Simple Explanation:** Monitoring is like having a dashboard in your car. It shows you speed (request rate), fuel level (memory usage), and engine temperature (CPU usage) so you can catch problems before they break your application.

## 🚀 Quick Start (TL;DR)

If you want to get monitoring working quickly:

```bash
# 1. Deploy monitoring stack
kubectl create namespace monitoring
kubectl apply -f k8s/prometheus-rbac.yaml
kubectl apply -f k8s/monitoring.yaml

# 2. Start port-forwards
kubectl port-forward svc/prometheus 9090:9090 -n monitoring &
kubectl port-forward svc/grafana 3000:3000 -n monitoring &
kubectl port-forward svc/backend 3001:3001 -n humor-game &

# 3. Generate sample data
chmod +x scripts/populate-game-metrics.sh
./scripts/populate-game-metrics.sh

# 4. Access dashboards and import comprehensive dashboard
# Grafana: http://localhost:3000 (admin/admin123)
# Import: k8s/comprehensive-dashboard.json
or 
# Import: k8s/advanced-custom-dashboard.json
# Prometheus: http://localhost:9090

# OPTIONAL: Set up ingress access (no port-forwarding)
# chmod +x scripts/setup-monitoring-ingress.sh
# ./scripts/setup-monitoring-ingress.sh
# Access: http://grafana.gameapp.local:8080
```

## Do This

### Install CRDs for ServiceMonitor

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

### Step 1: Deploy Monitoring Infrastructure

```bash
# Create monitoring namespace and RBAC permissions
kubectl apply -f k8s/prometheus-rbac.yaml
```

**Expected Output:**
```bash
namespace/monitoring created
serviceaccount/prometheus created
clusterrole.rbac.authorization.k8s.io/prometheus created
clusterrolebinding.rbac.authorization.k8s.io/prometheus created
```

```bash
# Deploy Prometheus and Grafana stack
kubectl apply -f k8s/monitoring.yaml
```

**Expected Output:**
```bash
configmap/grafana-datasources created
configmap/prometheus-config created
deployment.apps/prometheus created
deployment.apps/grafana created
service/prometheus created
service/grafana created

```bash
# Wait for monitoring services to be ready (this takes a few minutes)
kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s

# Verify monitoring stack is running
kubectl get pods -n monitoring
# Should show prometheus and grafana pods with "1/1 Running"
```

**Expected Output:**
```bash
NAME                          READY   STATUS    RESTARTS   AGE
grafana-7d8f9c8f9c-abc12     1/1     Running   0          3m
prometheus-8e9f0d1e2f-def34  1/1     Running   0          3m
```

### Step 2: Access Your Monitoring Dashboards

**Option 1: Port-Forwarding (Traditional Method)**
```bash
# Access Prometheus (metrics database)
kubectl port-forward svc/prometheus 9090:9090 -n monitoring &
```

**Expected Output:**
```bash
Forwarding from 127.0.0.1:9090 -> 9090
Forwarding from [::1]:9090 -> 9090
```

```bash
# Access Grafana (dashboard interface)
kubectl port-forward svc/grafana 3000:3000 -n monitoring &
```

**Expected Output:**
```bash
Forwarding from 127.0.0.1:3000 -> 3000
Forwarding from [::1]:3000 -> 3000
```

```bash
# Open monitoring interfaces
open http://localhost:9090  # Prometheus UI
open http://localhost:3000  # Grafana UI (login: admin/admin123)
```

**Option 2: Ingress-Based Access (No Port-Forwarding Required)**

Set up ingress access for convenient monitoring without port-forwarding:

```bash
# Set up monitoring ingress and DNS
chmod +x scripts/setup-monitoring-ingress.sh
./scripts/setup-monitoring-ingress.sh

# Expected output:
# ✅ Added prometheus.gameapp.local to /etc/hosts
# ✅ Added grafana.gameapp.local to /etc/hosts
# 🎉 Monitoring ingress setup complete!
```

**Access URLs (No Port-Forwarding Required):**
- **Prometheus**: http://prometheus.gameapp.local:8080
- **Grafana**: http://grafana.gameapp.local:8080

> **💡 Benefits of Ingress Access:**
> - No need to manage multiple port-forward processes
> - Clean, memorable URLs for monitoring services
> - Works automatically once configured
> - Production-like setup for learning

### Step 3: Explore Prometheus Metrics

Open `http://localhost:9090` and explore the metrics Prometheus is collecting:

**Basic queries to try:**
```bash
# In Prometheus query interface, try these:

# Pod CPU usage
rate(container_cpu_usage_seconds_total[5m])
```

**Expected Output:**
```json
{container="humor-game-backend",namespace="humor-game",pod="humor-game-backend-7d8f9c8f9c-abc12"} 0.001234
{container="humor-game-frontend",namespace="humor-game",pod="humor-game-frontend-8e9f0d1e2f-def34"} 0.000567
```

```bash
# Pod memory usage  
container_memory_usage_bytes
```

**Expected Output:**
```json
{container="humor-game-backend",namespace="humor-game",pod="humor-game-backend-7d8f9c8f9c-abc12"} 156789012
{container="humor-game-frontend",namespace="humor-game",pod="humor-game-frontend-8e9f0d1e2f-def34"} 23456789
```

```bash
# HTTP requests to your backend
rate(http_requests_total[5m])
```

**Expected Output:**
```json
{method="GET",status="200",endpoint="/api/health"} 0.1
{method="POST",status="200",endpoint="/api/game"} 0.05
```

```bash
# Kubernetes pod restarts
increase(kube_pod_container_status_restarts_total[1h])
```

**Expected Output:**
```json
{namespace="humor-game",pod="humor-game-backend-7d8f9c8f9c-abc12"} 0
{namespace="humor-game",pod="humor-game-frontend-8e9f0d1e2f-def34"} 0
```

### Step 4: Create Your First Grafana Dashboard

Open `http://localhost:3000` and login with `admin/admin123`.

**You have two options for dashboard creation:**

#### Option A: Import Pre-built Dashboards (Recommended)

**Import Basic Custom Dashboard:**
1. Click the "+" icon in the left sidebar → "Import"
2. Click "Upload JSON file"  
3. Select: `k8s/custom-dashboard.json`
4. Click "Load"
5. Verify Data Source shows: "Prometheus (default)"
6. Click "Import"

**Import Advanced Production Dashboard:**
1. Click the "+" icon in the left sidebar → "Import"
2. Click "Upload JSON file"
3. Select: `k8s/advanced-custom-dashboard.json` 
4. Click "Load"
5. Verify Data Source shows: "Prometheus (default)"
6. Click "Import"

**Import Comprehensive Dashboard (Recommended - Shows All Metrics):**
1. Click the "+" icon in the left sidebar → "Import"
2. Click "Upload JSON file"
3. Select: `k8s/comprehensive-dashboard.json`
4. Click "Load"
5. Verify Data Source shows: "Prometheus (default)"
6. Click "Import"

> **💡 Tip**: The comprehensive dashboard includes all available metrics in a single view with:
> - Application health status
> - HTTP request rates and error rates
> - Response time percentiles
> - Memory and CPU usage
> - Database connections
> - Real-time error tracking

#### Option B: Create Manual Dashboard

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

### Step 5: Import Advanced Custom Dashboards

Instead of building dashboards from scratch, import our pre-built production-ready dashboards:

**Option 1: Import Basic Custom Dashboard**
```bash
# 1. In Grafana, click the "+" icon → "Import"
# 2. Click "Upload JSON file"
# 3. Select: k8s/custom-dashboard.json
# 4. Click "Load"
# 5. Verify Data Source: Should show "Prometheus (default)"
# 6. Click "Import"
```

**Option 2: Import Advanced Production Dashboard**
```bash
# 1. In Grafana, click the "+" icon → "Import"
# 2. Click "Upload JSON file"
# 3. Select: k8s/advanced-custom-dashboard.json
# 4. Click "Load"
# 5. Verify Data Source: Should show "Prometheus (default)"
# 6. Click "Import"
```

### Step 6: Generate Test Traffic to Populate Dashboards

Now that you've imported the dashboards, you need to generate traffic to see actual data. Here are the **tested working steps**:

**Step 6a: Start Required Port-Forwards**
```bash
# These should already be running from previous steps, but if not:
kubectl port-forward svc/prometheus 9090:9090 -n monitoring &
kubectl port-forward svc/grafana 3000:3000 -n monitoring &
kubectl port-forward svc/backend 3001:3001 -n humor-game &
```

**Step 6b: Populate Sample Metrics (Recommended)**
```bash
# Run the metrics population script
chmod +x scripts/populate-game-metrics.sh
./scripts/populate-game-metrics.sh

# Expected output: 
# - 1000+ HTTP requests generated
# - App health metrics populated
# - Error metrics for testing
```

**Expected Results After Running Script:**
```bash
✅ Metrics population complete!
📊 HTTP Requests: 1163
📊 Active Games: 0  
📊 App Health: 1 (healthy)

💡 Available working metrics:
  • http_requests_total
  • http_errors_total
  • http_request_duration_seconds
  • app_health_status
  • app_memory_usage_bytes
  • app_cpu_usage_percent
  • database_connections_current
```

**Step 6c: Verify Metrics in Prometheus**
```bash
# Check HTTP requests
curl -s 'http://localhost:9090/api/v1/query?query=http_requests_total' | jq '.data.result[0].value[1]'

# Check app health
curl -s 'http://localhost:9090/api/v1/query?query=app_health_status' | jq '.data.result[0].value[1]'
```

### Step 7: Fix Dashboard "No Data" Issues

If you see "No data" in your Grafana dashboard panels, follow these steps:

**Step 7a: Check Panel Queries**
1. Click on the panel showing "No data"
2. Click "Edit" (pencil icon)
3. In the query editor, replace non-working queries with these **tested working queries**:

**Working Panel Queries:**
```bash
# Panel 1: HTTP Request Rate (WORKING)
rate(http_requests_total[5m])

# Panel 2: Application Health Status (WORKING)  
app_health_status

# Panel 3: Error Rate (WORKING)
rate(http_errors_total[5m])

# Panel 4: Response Time (WORKING)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Panel 5: Memory Usage (WORKING)
app_memory_usage_bytes / 1024 / 1024

# Panel 6: Database Connections (WORKING)
database_connections_current
```

**Step 7b: Refresh and Verify**
```bash
# After updating queries:
1. Click "Apply" to save panel changes
2. Return to dashboard view  
3. Set time range to "Last 15 minutes"
4. Click "Refresh" button
5. Generate more traffic if needed: ./scripts/populate-game-metrics.sh
```

## You Should See...

**Monitoring Stack Status:**
```
NAME                       READY   STATUS    RESTARTS   AGE
prometheus-7c8b7c8b7c8b   1/1     Running   0          15m
grafana-9d8e7d6c5b-def34  1/1     Running   0          20m
```

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
```bash
✅ Prometheus: 5+ targets UP
✅ Grafana: All 4 panels showing data
✅ Metrics: Real-time updates during load testing
✅ RBAC: No permission errors in logs
```

## ✅ Checkpoint

Your monitoring is working when:
- ✅ Prometheus collects metrics at `http://localhost:9090`
- ✅ Grafana shows dashboards at `http://localhost:3000`
- ✅ Login to Grafana works with `admin/admin123`
- ✅ Custom dashboards imported successfully
- ✅ HTTP request metrics show real data (1000+ requests)
- ✅ Error tracking works (404s appear in dashboard)
- ✅ Prometheus targets page shows all services "UP"
- ✅ Metrics update in real-time when you generate traffic

## If It Fails

### Symptom: Dashboard shows "No data"
**Cause:** Dashboard queries looking for metrics that don't exist yet
**Command to confirm:** Check what metrics are actually available
**Fix:**
```bash
# Check available metrics
curl -s 'http://localhost:9090/api/v1/label/__name__/values' | jq '.data[]' | grep -E "(http_|app_|game_)"

# Generate sample data
./scripts/populate-game-metrics.sh

# Update dashboard queries to use working metrics:
# - Change game_scores_total to http_requests_total  
# - Change unique_users_total to app_health_status
# - Use rate(http_requests_total[5m]) for request rate
```

### Symptom: No metrics showing in Grafana  
**Cause:** Prometheus not scraping targets or data source not configured
**Command to confirm:** Go to http://localhost:9090/targets
**Fix:**
```bash
# Check Prometheus is scraping targets
# Go to http://localhost:9090/targets
# All targets should show "UP" status

# Verify backend pod has annotations
kubectl get pod -n humor-game -o yaml | grep prometheus.io

# Check if metrics endpoint responds
curl -s http://localhost:3001/metrics | head -10
```

### Symptom: Grafana shows "No data"
**Cause:** Prometheus data source not working or no metrics collected
**Command to confirm:** Test Prometheus data source in Grafana
**Fix:**
```bash
# Test Prometheus data source in Grafana
# Go to Configuration -> Data Sources -> Test
# Should show "Data source is working"

# Check Prometheus has data
# In Prometheus UI, try query: up
# Should return 1 for healthy targets
```

### Symptom: Dashboards are empty
**Cause:** Incorrect namespace in queries or no traffic generated
**Command to confirm:** Verify correct namespace in queries
**Fix:**
```bash
# Verify correct namespace in queries
# Query should include: {namespace="humor-game"}

# Check metric names are correct
# In Prometheus, use "Metrics" dropdown to see available metrics

# Generate some traffic to create data
curl -H "Host: gameapp.local" http://localhost:8080/api/health
```

### Symptom: Prometheus pod won't start
**Cause:** RBAC configuration issues or resource constraints
**Command to confirm:** `kubectl get pods -n monitoring`
**Fix:**
```bash
# Check RBAC configuration
kubectl get serviceaccount -n monitoring
kubectl get clusterrole | grep prometheus

# If missing, apply RBAC
kubectl apply -f k8s/prometheus-rbac.yaml
```

### Symptom: Port-forwarding not working
**Cause:** Port conflicts or processes already using ports
**Command to confirm:** `lsof -i :3000` and `lsof -i :9090`
**Fix:**
```bash
# Kill conflicting processes
lsof -ti:3000 | xargs kill -9
lsof -ti:9090 | xargs kill -9

# Restart port-forwards
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
```

## 💡 **Reset/Rollback Commands**

If you need to start over or fix issues:

```bash
# Remove monitoring stack
kubectl delete namespace monitoring

# Remove specific monitoring components
kubectl delete deployment prometheus -n monitoring
kubectl delete deployment grafana -n monitoring

# Reset Grafana to factory defaults
kubectl exec -it deployment/grafana -n monitoring -- rm -rf /var/lib/grafana/*

# Restart monitoring services
kubectl rollout restart deployment/prometheus -n monitoring
kubectl rollout restart deployment/grafana -n monitoring

# Check monitoring status
kubectl get pods -n monitoring
kubectl logs -n monitoring -l app=prometheus
kubectl logs -n monitoring -l app=grafana
```

## 🧪 Testing Your Observability Setup

Follow these **tested working steps** to validate your monitoring:

### Test 1: Verify All Services Running
```bash
# Check monitoring pods
kubectl get pods -n monitoring
# Expected: prometheus and grafana pods "1/1 Running"

# Check port-forwards are active  
lsof -i :9090 -i :3000 -i :3001
# Expected: Should show active connections
```

### Test 2: Verify Prometheus Data Collection
```bash
# Test Prometheus is collecting metrics
curl -s 'http://localhost:9090/api/v1/query?query=up' | jq '.data.result | length'
# Expected: Should return number > 5 (multiple targets)

# Check specific app metrics
curl -s 'http://localhost:9090/api/v1/query?query=http_requests_total' | jq '.data.result[0].value[1]'
# Expected: Should return a number (request count)
```

### Test 3: Verify Grafana Access
```bash
# Test Grafana health
curl -s http://localhost:3000/api/health | jq '.database'
# Expected: "ok"

# Login test: Go to http://localhost:3000 
# Username: admin, Password: admin123
# Expected: Successful login to Grafana interface
```

### Test 4: Generate and Verify Metrics
```bash
# Run the tested metrics script
./scripts/populate-game-metrics.sh

# Verify metrics appear in Prometheus
curl -s 'http://localhost:9090/api/v1/query?query=http_requests_total' | jq '.data.result[0].value[1]'
# Expected: Number should increase (1000+)

# Check in Grafana dashboard
# Expected: Panels should show data within 30 seconds
```

## Understanding Production Monitoring

**The Three Pillars of Observability:**
1. **Metrics:** Numerical data over time (CPU, memory, request rates)
2. **Logs:** Event records with context (error messages, user actions)  
3. **Traces:** Request flow through distributed services

**Key Metrics Categories:**
- **RED Metrics:** Rate, Errors, Duration (user-facing performance)
- **USE Metrics:** Utilization, Saturation, Errors (resource health)
- **Business Metrics:** Game sessions, user signups, revenue

## What You Learned

You've implemented enterprise observability:
- **Metrics collection** with Prometheus for time-series data
- **Data visualization** with Grafana for operational dashboards  
- **Custom dashboards** tailored to your application's needs
- **Load testing** to validate monitoring under stress
- **Production monitoring patterns** used by major technology companies

## Professional Skills Gained

- **Observability architecture** that scales to thousands of services
- **Dashboard creation** for different stakeholder audiences
- **Metrics-driven debugging** to identify performance bottlenecks
- **Capacity planning** using historical resource utilization data
- **Troubleshooting complex monitoring issues** with systematic approaches

---

*Observability milestone completed successfully. Prometheus and Grafana running, dashboards populated, ready for [06-gitops.md](06-gitops.md).*
