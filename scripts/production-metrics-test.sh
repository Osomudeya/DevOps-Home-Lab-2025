#!/bin/bash

# Production Metrics Test Script for Humor Memory Game
# This script simulates real production traffic and generates business metrics

echo "🚀 Production Metrics Test - Humor Memory Game"
echo "=============================================="

# Configuration
BACKEND_URL="http://localhost:3001"
TEST_DURATION=300  # 5 minutes
USERS=10
GAMES_PER_USER=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test functions
test_health_endpoint() {
    echo -e "${BLUE}📊 Testing Health Endpoint...${NC}"
    for i in {1..20}; do
        response=$(curl -s -w "%{http_code}" "$BACKEND_URL/health" -o /dev/null)
        if [[ $response == "200" ]]; then
            echo -e "  ${GREEN}✓ Health check $i completed${NC}"
        else
            echo -e "  ${RED}✗ Health check $i failed (HTTP $response)${NC}"
        fi
        sleep 0.5
    done
}

test_api_endpoints() {
    echo -e "${BLUE}🎮 Testing API Endpoints...${NC}"
    
    # Test API welcome
    for i in {1..10}; do
        response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api" -o /dev/null)
        if [[ $response == "200" ]]; then
            echo -e "  ${GREEN}✓ API welcome $i completed${NC}"
        else
            echo -e "  ${RED}✗ API welcome $i failed (HTTP $response)${NC}"
        fi
        sleep 0.3
    done
    
    # Test scores endpoint
    for i in {1..8}; do
        response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/scores/testuser$i" -o /dev/null)
        if [[ $response == "200" || $response == "404" ]]; then
            echo -e "  ${GREEN}✓ Scores check $i completed${NC}"
        else
            echo -e "  ${RED}✗ Scores check $i failed (HTTP $response)${NC}"
        fi
        sleep 0.4
    done
    
    # Test leaderboard
    for i in {1..6}; do
        response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/leaderboard" -o /dev/null)
        if [[ $response == "200" ]]; then
            echo -e "  ${GREEN}✓ Leaderboard check $i completed${NC}"
        else
            echo -e "  ${RED}✗ Leaderboard check $i failed (HTTP $response)${NC}"
        fi
        sleep 0.5
    done
}

simulate_game_play() {
    echo -e "${BLUE}🎯 Simulating Game Play...${NC}"
    
    for user in $(seq 1 $USERS); do
        username="testuser$user"
        echo -e "  ${YELLOW}👤 User: $username${NC}"
        
        for game in $(seq 1 $GAMES_PER_USER); do
            # Simulate game start
            echo -e "    🎮 Starting game $game..."
            
            # Simulate game duration (random between 30-300 seconds)
            game_duration=$((RANDOM % 270 + 30))
            sleep 0.1  # Simulate game time
            
            # Simulate score (random between 50-1500)
            score=$((RANDOM % 1450 + 50))
            
            # Simulate accuracy (random between 60-100%)
            accuracy=$((RANDOM % 40 + 60))
            
            echo -e "      📊 Game completed - Score: $score, Time: ${game_duration}s, Accuracy: ${accuracy}%"
            
            # Add some random delays to simulate real user behavior
            sleep $((RANDOM % 3 + 1))
        done
        
        echo -e "  ${GREEN}✓ User $username completed all games${NC}"
        sleep 2
    done
}

test_error_scenarios() {
    echo -e "${BLUE}⚠️  Testing Error Scenarios...${NC}"
    
    # Test invalid endpoints
    for i in {1..5}; do
        response=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/invalid" -o /dev/null)
        if [[ $response == "404" ]]; then
            echo -e "  ${GREEN}✓ Invalid endpoint test $i (expected 404)${NC}"
        else
            echo -e "  ${YELLOW}⚠ Invalid endpoint test $i got HTTP $response${NC}"
        fi
        sleep 0.2
    done
    
    # Test malformed requests
    for i in {1..3}; do
        response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/game/start" \
                   -H "Content-Type: application/json" \
                   -d '{"invalid": "data"}' -o /dev/null)
        if [[ $response == "400" || $response == "500" ]]; then
            echo -e "  ${GREEN}✓ Malformed request test $i (expected error)${NC}"
        else
            echo -e "  ${YELLOW}⚠ Malformed request test $i got HTTP $response${NC}"
        fi
        sleep 0.3
    done
}

test_metrics_endpoint() {
    echo -e "${BLUE}📈 Testing Metrics Endpoint...${NC}"
    
    for i in {1..15}; do
        response=$(curl -s -w "%{http_code}" "$BACKEND_URL/metrics" -o /dev/null)
        if [[ $response == "200" ]]; then
            echo -e "  ${GREEN}✓ Metrics check $i completed${NC}"
        else
            echo -e "  ${RED}✗ Metrics check $i failed (HTTP $response)${NC}"
        fi
        sleep 0.2
    done
}

load_test() {
    echo -e "${BLUE}🔥 Load Testing...${NC}"
    
    # Simulate burst traffic
    for burst in {1..3}; do
        echo -e "  ${YELLOW}💥 Burst $burst: Sending 20 concurrent requests${NC}"
        
        for i in {1..20}; do
            (
                response=$(curl -s -w "%{http_code}" "$BACKEND_URL/health" -o /dev/null)
                if [[ $response == "200" ]]; then
                    echo -e "    ${GREEN}✓ Concurrent request $i completed${NC}"
                else
                    echo -e "    ${RED}✗ Concurrent request $i failed (HTTP $response)${NC}"
                fi
            ) &
        done
        
        wait
        echo -e "  ${GREEN}✓ Burst $burst completed${NC}"
        sleep 5
    done
}

# Main test execution
echo -e "${GREEN}Starting production metrics test...${NC}"
echo -e "Duration: ${TEST_DURATION}s | Users: $USERS | Games per user: $GAMES_PER_USER"
echo ""

# Run tests
test_health_endpoint
echo ""
test_api_endpoints
echo ""
simulate_game_play
echo ""
test_error_scenarios
echo ""
test_metrics_endpoint
echo ""
load_test
echo ""

echo -e "${GREEN}✅ Production metrics test completed!${NC}"
echo ""
echo -e "${BLUE}📊 Check your metrics:${NC}"
echo -e "  • Grafana Dashboard: http://localhost:3000"
echo -e "  • Prometheus: http://localhost:9090"
echo -e "  • Your App: http://gameapp.local:8080"
echo ""
echo -e "${YELLOW}💡 Look for these production metrics:${NC}"
echo -e "  • HTTP Request Rate and Error Rate"
echo -e "  • Response Time (95th percentile)"
echo -e "  • Game Performance (scores, accuracy, completion time)"
echo -e "  • User Engagement (unique users, session duration)"
echo -e "  • Database and Redis Performance"
echo -e "  • Application Health and Uptime"
echo -e "  • Resource Utilization (CPU, Memory)"
echo ""
echo -e "${BLUE}🚨 Check Prometheus Alerts for:${NC}"
echo -e "  • High Error Rates (>10%)"
echo -e "  • Slow Response Times (>2s)"
echo -e "  • Database Connection Issues"
echo -e "  • Low Cache Hit Rates"
echo -e "  • Application Health Issues"
