#!/bin/bash
# Regression Guards for Milestone 1 Fixes
# Ensures critical fixes are permanent and not regressed

set -e
echo "🔒 Running Regression Guards for Milestone 1 Fixes..."

# 1) Backend: no catch-all route that swallows frontend paths
echo "🔍 Checking for backend catch-all routes..."
if grep -R "^\\s*app\.use(\\s*'\\*'" backend 2>/dev/null; then
    echo "❌ ERROR: catch-all route present in backend"
    exit 1
fi
echo "✅ No catch-all routes found"

# 2) Backend: /api/health exists and responds in container
echo "🔍 Checking for /api/health route..."
if ! grep -R "/api/health" backend; then
    echo "❌ ERROR: /api/health route not found in backend"
    exit 1
fi
echo "✅ /api/health route found"

# 3) Nginx: no trailing slash in proxy_pass
echo "🔍 Checking nginx proxy_pass configuration..."
if ! grep -R "proxy_pass\\s\\+http://backend:3001;" nginx-reverse-proxy.conf; then
    echo "❌ ERROR: proxy_pass not exact (should be http://backend:3001, not http://backend:3001/)"
    exit 1
fi
echo "✅ proxy_pass configuration correct"

# 4) Frontend: no alert() left in shipped code and config waits are async-safe
echo "🔍 Checking for alert() statements..."
if grep -R "^\\s*alert(" frontend/src; then
    echo "❌ ERROR: alert() found in frontend code"
    exit 1
fi
echo "✅ No alert() statements found"

echo "🔍 Checking for async config loader..."
if ! grep -R "await.*waitForConfig" frontend/src; then
    echo "❌ ERROR: async config loader not found"
    exit 1
fi
echo "✅ Async config loader found"

# 5) Env var/startup template syntax fixed (no {{VAR}} leftovers)
echo "🔍 Checking for template placeholders..."
if grep -R "{{.*}}" frontend/src; then
    echo "❌ ERROR: template placeholders remain in frontend"
    exit 1
fi
echo "✅ No template placeholders found"

echo "🎉 All regression guards passed! Milestone 1 fixes are permanent."
