# 📁 **CLEAN FILE STRUCTURE - Humor Memory Game**

## 🎯 **ONLY 3 FILES MATTER FOR BEGINNERS:**

### **1. `k8s/env.template`**
- **Purpose**: Template for your configuration
- **Action**: Copy to `k8s/.env` and fill in your values

### **2. `k8s/configmap.yaml`**
- **Purpose**: All your settings and secrets in one place
- **Action**: Edit secret values directly here

### **3. `scripts/deploy-with-secrets.sh`**
- **Purpose**: Deploy everything with one command
- **Action**: Run after setting up your `.env` file

## 🚀 **BEGINNER WORKFLOW (3 Steps):**

1. **Copy template**: `cp k8s/env.template k8s/.env`
2. **Edit secrets**: Open `k8s/configmap.yaml` and replace `${DB_PASSWORD}` with your actual password
3. **Deploy**: Run `./scripts/deploy-with-secrets.sh`

## 🔧 **SUPPORTING FILES (Don't Edit - They Just Work):**
- `k8s/backend.yaml` - Backend deployment
- `k8s/frontend.yaml` - Frontend deployment  
- `k8s/postgres.yaml` - Database setup
- `k8s/redis.yaml` - Cache setup
- `k8s/monitoring.yaml` - Prometheus & Grafana
- `k8s/ingress.yaml` - Web traffic routing

## 📚 **LEARNING FILES:**
- `home-lab-2.md` - Your main step-by-step guide
- `README.md` - Project overview

---

**🎯 Focus on the 3 essential files above. Everything else works automatically!**
