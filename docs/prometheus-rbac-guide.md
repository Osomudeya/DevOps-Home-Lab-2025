# 🔐 Prometheus RBAC & Service Accounts Guide

## **Overview**
This guide explains why Prometheus needs RBAC (Role-Based Access Control) and service accounts in Kubernetes, and what happens if they're not properly configured.

## **🤔 What is RBAC?**

**RBAC** stands for **Role-Based Access Control**. It's a security system that controls who can access what resources in Kubernetes.

Think of it like a security guard at a building:
- **Without RBAC**: Anyone can access any room
- **With RBAC**: Only people with proper badges can access specific rooms

## **🎯 Why Does Prometheus Need RBAC?**

### **1. Security**
- **Prevents unauthorized access** to cluster resources
- **Limits what Prometheus can see** and scrape
- **Protects sensitive data** from being exposed

### **2. Compliance**
- **Audit trails** for who accessed what
- **Security policies** enforcement
- **Enterprise requirements** often mandate RBAC

### **3. Resource Discovery**
- **Service discovery** requires permissions to list pods, services, endpoints
- **Metrics scraping** needs access to pod metrics endpoints
- **Namespace access** to discover targets across different namespaces

## **👤 What is a Service Account?**

A **Service Account** is like a "user account" for applications running in Kubernetes.

### **Real-World Analogy**
- **Human user**: You log in with username/password
- **Service Account**: Prometheus "logs in" with a special identity
- **Permissions**: What that identity is allowed to do

### **Why Prometheus Needs One**
1. **Identity**: Kubernetes needs to know "who" is making requests
2. **Permissions**: What resources Prometheus can access
3. **Security**: Prevents Prometheus from accessing everything

## **🚨 What Happens Without RBAC/Service Accounts?**

### **1. Prometheus Pod Won't Start**
```bash
# Error you'll see:
Error: pods "prometheus-xxx" is forbidden: 
service account "default" not found
```

### **2. No Target Discovery**
```bash
# Prometheus /targets page will show:
# No targets found
# Error: permission denied
```

### **3. Can't Scrape Metrics**
```bash
# Prometheus logs will show:
# permission denied
# forbidden
# 403 errors
```

### **4. Security Vulnerabilities**
- **Over-privileged access** to cluster resources
- **Potential data exposure** of sensitive information
- **No audit trail** of what Prometheus accessed

## **🔧 How RBAC Works in Prometheus**

### **1. Service Account**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring
```

### **2. Cluster Role (What Prometheus Can Do)**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
```

### **3. Cluster Role Binding (Connects Role to Service Account)**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
```

## **📊 What Each Permission Does**

### **Nodes**
- **`get`**: Read node information
- **`list`**: List all nodes in cluster
- **`watch`**: Monitor node changes

### **Services**
- **`get`**: Read service details
- **`list`**: List all services
- **`watch`**: Monitor service changes

### **Endpoints**
- **`get`**: Read endpoint details
- **`list`**: List all endpoints
- **`watch`**: Monitor endpoint changes

### **Pods**
- **`get`**: Read pod information
- **`list`**: List all pods
- **`watch`**: Monitor pod changes

## **🔍 Troubleshooting RBAC Issues**

### **1. Check Service Account Exists**
```bash
kubectl get serviceaccount -n monitoring
```

**Expected Output:**
```
NAME        SECRETS   AGE
default     1         2d
prometheus  1         2d
```

### **2. Check Cluster Role Exists**
```bash
kubectl get clusterrole | grep prometheus
```

**Expected Output:**
```
prometheus   2023-08-23T10:00:00Z
```

### **3. Check Cluster Role Binding**
```bash
kubectl get clusterrolebinding | grep prometheus
```

**Expected Output:**
```
prometheus   2023-08-23T10:00:00Z
```

### **4. Check Prometheus Pod Permissions**
```bash
kubectl describe pod prometheus-xxx -n monitoring
```

**Look for:**
```
Service Account: prometheus
```

### **5. Check Prometheus Logs**
```bash
kubectl logs prometheus-xxx -n monitoring
```

**Look for:**
```
permission denied
forbidden
403 errors
```

## **🚀 Common RBAC Fixes**

### **1. Missing Service Account**
```bash
# Create service account
kubectl create serviceaccount prometheus -n monitoring
```

### **2. Missing Cluster Role**
```bash
# Apply the RBAC configuration
kubectl apply -f k8s/prometheus-rbac.yaml
```

### **3. Wrong Namespace**
```bash
# Check if service account is in correct namespace
kubectl get serviceaccount prometheus -n monitoring
```

### **4. Permission Issues**
```bash
# Check what the service account can do
kubectl auth can-i list pods --as=system:serviceaccount:monitoring:prometheus
```

## **⏱️ Performance Expectations**

### **Prometheus Pod Creation Time**
- **First time**: 10-15 minutes (downloading images, setting up RBAC)
- **Subsequent times**: 2-5 minutes
- **Why slow**: Large container images and RBAC setup

### **Target Discovery Time**
- **Initial discovery**: 1-2 minutes
- **Metrics collection**: 30 seconds to start seeing data
- **Full dashboard population**: 5-10 minutes

## **💡 Best Practices**

### **1. Least Privilege**
- **Only give necessary permissions**
- **Don't grant admin access**
- **Review permissions regularly**

### **2. Namespace Isolation**
- **Use namespaced roles when possible**
- **Limit cross-namespace access**
- **Monitor what Prometheus can see**

### **3. Regular Audits**
- **Check permissions quarterly**
- **Review access logs**
- **Update RBAC as needed**

## **🔗 Related Documentation**

- [Home Lab Setup Guide](../home-lab.md) - Complete setup instructions
- [Monitoring Configuration](../k8s/monitoring.yaml) - RBAC configuration
- [Troubleshooting Guide](../docs/troubleshooting.md) - Common issues and fixes

## **📚 Additional Resources**

- [Kubernetes RBAC Documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Prometheus Security Best Practices](https://prometheus.io/docs/operating/security/)
- [Kubernetes Service Accounts](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)

---

**Remember**: RBAC is your security foundation. Properly configured RBAC prevents security breaches while ensuring Prometheus can do its job effectively! 🔒✅
