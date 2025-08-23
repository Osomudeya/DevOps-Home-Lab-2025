# 🔧 Troubleshooting Guide - Humor Memory Game

## **Overview**
This guide covers common issues you might encounter while setting up and running your Humor Memory Game with monitoring, and provides step-by-step solutions.

## **🚨 Common Issues & Quick Fixes**

### **1. "No Data" in Grafana Dashboards**

#### **Problem**
Grafana panels show "No data" instead of metrics.

#### **Causes & Solutions**

**A. Prometheus Not Scraping Targets**
```bash
# Check if Prometheus can see your pods
kubectl get pods -n humor-game -o yaml | grep -A 5 -B 5 prometheus

# Expected: Should see prometheus.io/scrape annotations
```

**B. Missing Prometheus Annotations**
```bash
# Check if your pods have the right labels
kubectl get pods -n humor-game --show-labels

# Should see: app=backend, app=frontend
```

**C. Prometheus Targets Empty**
```bash
# Check Prometheus targets page
# Go to: http://localhost:9090/targets
# Should see: kubernetes-pods targets
```

#### **Fix**
```bash
# Redeploy with proper annotations
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

### **2. Port-Forwarding Issues**

#### **Problem**
```bash
# Error: Unable to listen on port XXXX: bind: address already in use
```

#### **Solution**
```bash
# Kill existing port-forwards
lsof -ti:3000 | xargs kill -9
lsof -ti:9090 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Start fresh port-forwards
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
kubectl port-forward -n humor-game svc/backend 3001:3001 &
```

### **3. Backend Connection Issues**

#### **Problem**
Scripts get HTTP 000 errors when trying to connect to backend.

#### **Solution**
```bash
# Check if backend port-forward is running
lsof -i :3001

# If not running, start it
kubectl port-forward -n humor-game svc/backend 3001:3001 &

# Test connection
curl -s http://localhost:3001/health
```

### **4. Prometheus Pod Won't Start**

#### **Problem**
```bash
# Error: service account "prometheus" not found
```

#### **Solution**
```bash
# Check if RBAC is configured
kubectl get serviceaccount -n monitoring

# If missing, apply RBAC
kubectl apply -f k8s/prometheus-rbac.yaml

# Check cluster roles
kubectl get clusterrole | grep prometheus
```

### **5. Grafana Dashboard Import Issues**

#### **Problem**
```bash
# Error: Dashboard title cannot be empty
# Dashboard creation loop
```

#### **Solution**
```bash
# Use the fixed dashboard files
# Import: k8s/working-dashboard.json
# Import: k8s/advanced-custom-dashboard.json

# Or export existing dashboard and edit
# In Grafana: Dashboard → Settings → Export → Export for sharing externally
```

## **🔍 Diagnostic Commands**

### **Check Pod Status**
```bash
# All namespaces
kubectl get pods --all-namespaces

# Specific namespace
kubectl get pods -n humor-game
kubectl get pods -n monitoring

# Detailed pod info
kubectl describe pod <pod-name> -n <namespace>
```

### **Check Services**
```bash
# List all services
kubectl get svc --all-namespaces

# Check specific service
kubectl get svc backend -n humor-game
kubectl get svc prometheus -n monitoring
```

### **Check Logs**
```bash
# Backend logs
kubectl logs -f deployment/backend -n humor-game

# Prometheus logs
kubectl logs -f deployment/prometheus -n monitoring

# Grafana logs
kubectl logs -f deployment/grafana -n monitoring
```

### **Check Network Policies**
```bash
# List network policies
kubectl get networkpolicy --all-namespaces

# Check if policies are blocking traffic
kubectl describe networkpolicy <policy-name> -n <namespace>
```

### **Check Resource Usage**
```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods --all-namespaces

# Check if pods are resource-constrained
kubectl describe pod <pod-name> -n <namespace> | grep -A 10 Events
```

## **📊 Monitoring Health Checks**

### **1. Prometheus Health**
```bash
# Check if Prometheus is responding
curl -s http://localhost:9090/-/healthy

# Check targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'

# Expected: Should see multiple targets
```

### **2. Grafana Health**
```bash
# Check if Grafana is responding
curl -s http://localhost:3000/api/health

# Expected: {"database":"ok","version":"x.x.x"}
```

### **3. Backend Health**
```bash
# Check backend health
curl -s http://localhost:3001/health

# Expected: {"status":"healthy","services":{"database":"connected","redis":"connected"}}
```

### **4. Metrics Endpoint**
```bash
# Check if metrics are being generated
curl -s http://localhost:3001/metrics | grep -c "http_requests_total"

# Expected: Should see numbers > 0
```

## **🚀 Performance Issues**

### **1. Slow Pod Creation**
```bash
# Check image pull status
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 Events

# Check if images are being pulled
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

**Expected Times:**
- **Prometheus**: 10-15 minutes first time, 2-5 minutes subsequent
- **Grafana**: 5-10 minutes first time, 2-3 minutes subsequent
- **Backend/Frontend**: 2-5 minutes

### **2. High Resource Usage**
```bash
# Check Colima resources
colima status

# If under-resourced, restart with more resources
colima stop
colima start --cpu 8 --memory 8 --disk 100
```

### **3. Slow Metrics Collection**
```bash
# Check Prometheus scrape interval
# Default: 15 seconds
# If too fast: Can cause performance issues

# Check target discovery
# Should see targets in "up" state
```

## **📝 Common Error Messages & Solutions**

### **"connection refused"**
```bash
# Service not running or port-forward not active
kubectl get svc -n <namespace>
lsof -i :<port>
```

### **"permission denied"**
```bash
# RBAC issue
kubectl get serviceaccount -n monitoring
kubectl get clusterrole | grep prometheus
```

### **"no route to host"**
```bash
# Network policy blocking traffic
kubectl get networkpolicy --all-namespaces
```

### **"image pull backoff"**
```bash
# Image not available or registry issue
kubectl describe pod <pod-name> -n <namespace>
```

## **🔧 Quick Fix Scripts**

### **Reset Everything**
```bash
#!/bin/bash
# Kill all port-forwards
lsof -ti:3000 | xargs kill -9
lsof -ti:9090 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Restart port-forwards
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
kubectl port-forward -n humor-game svc/backend 3001:3001 &

echo "Port-forwards restarted!"
```

### **Check All Services**
```bash
#!/bin/bash
echo "🔍 Checking all services..."

echo "📊 Pods Status:"
kubectl get pods --all-namespaces

echo "🌐 Services Status:"
kubectl get svc --all-namespaces

echo "🔐 RBAC Status:"
kubectl get serviceaccount -n monitoring
kubectl get clusterrole | grep prometheus

echo "✅ Health Checks:"
curl -s http://localhost:3000/api/health || echo "Grafana: ❌"
curl -s http://localhost:9090/-/healthy || echo "Prometheus: ❌"
curl -s http://localhost:3001/health || echo "Backend: ❌"
```

## **📚 Additional Resources**

- [Prometheus RBAC Guide](prometheus-rbac-guide.md) - Detailed RBAC explanation
- [Home Lab Setup](../home-lab.md) - Complete setup guide
- [Kubernetes Troubleshooting](https://kubernetes.io/docs/tasks/debug/) - Official docs

---

**Remember**: Most issues are related to port-forwarding, RBAC, or resource constraints. Start with the basic checks and work your way up! 🔧✅
