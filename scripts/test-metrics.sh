#!/bin/bash

# Test script to generate metrics for monitoring
echo "🧪 Testing Humor Memory Game Metrics..."

# Get the backend service URL
BACKEND_URL="http://localhost:3001"

# Test health endpoint multiple times
echo "📊 Testing health endpoint..."
for i in {1..10}; do
    curl -s "$BACKEND_URL/health" > /dev/null
    echo "  Health check $i completed"
    sleep 0.5
done

# Test metrics endpoint
echo "📈 Testing metrics endpoint..."
for i in {1..5}; do
    curl -s "$BACKEND_URL/metrics" > /dev/null
    echo "  Metrics check $i completed"
    sleep 0.5
done

# Test API endpoint
echo "🎮 Testing API endpoint..."
for i in {1..5}; do
    curl -s "$BACKEND_URL/api" > /dev/null
    echo "  API check $i completed"
    sleep 0.5
done

echo "✅ Metrics test completed!"
echo "🔍 Check Grafana dashboard at http://localhost:3000"
echo "📊 Check Prometheus at http://localhost:9090"
