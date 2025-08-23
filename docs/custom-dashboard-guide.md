# 🎨 Custom Dashboard Implementation Guide

## **Overview**
This guide shows you how to create custom dashboards in Grafana for your Humor Memory Game monitoring.

## **🚀 Quick Start: Import Pre-built Dashboards**

### **Step 1: Import Basic Dashboard**
1. Go to http://localhost:3000
2. Login: `admin` / `admin123`
3. Click **+** → **Import**
4. Upload: `k8s/custom-dashboard.json`
5. Select Prometheus data source
6. Click **Import**

### **Step 2: Import Advanced Dashboard**
1. Click **+** → **Import**
2. Upload: `k8s/advanced-custom-dashboard.json`
3. Select Prometheus data source
4. Click **Import**

## **🔧 Building Custom Dashboards from Scratch**

### **Step 1: Create New Dashboard**
1. Click **+** icon (top-left)
2. Select **"Dashboard"**
3. Click **"Add new panel"**

### **Step 2: Add Custom Panel**

#### **Example: Custom Game Metrics Panel**
1. **Query Editor**:
   - Data source: `Prometheus`
   - Query: `game_scores_total`
   - Legend: `{{difficulty}} - {{score_range}}`

2. **Panel Options**:
   - Title: "My Custom Game Metrics"
   - Visualization: "Stat"
   - Field: Value

3. **Click "Apply"**

### **Step 3: Customize Panel Appearance**
1. **Click on panel** to edit
2. **Field tab**: Configure colors, thresholds, units
3. **Display tab**: Set panel size, background, borders
4. **Click "Apply"**

## **📊 Panel Types and Use Cases**

### **1. Stat Panel**
- **Use for**: Single values, KPIs, status indicators
- **Example**: `up{job="kubernetes-pods"}`
- **Customization**: Colors, thresholds, units

### **2. Time Series Panel**
- **Use for**: Metrics over time, trends, performance
- **Example**: `rate(http_requests_total[5m])`
- **Customization**: Line styles, fill, colors

### **3. Gauge Panel**
- **Use for**: Percentages, ranges, progress
- **Example**: `redis_cache_hit_rate`
- **Customization**: Min/max values, thresholds

### **4. Heatmap Panel**
- **Use for**: Distribution data, response time buckets
- **Example**: `rate(http_request_duration_seconds_bucket[5m])`
- **Customization**: Color schemes, bucket ranges

### **5. Table Panel**
- **Use for**: Detailed data, multiple metrics
- **Example**: `up{job="kubernetes-pods"}`
- **Customization**: Column sorting, filtering

## **🎯 Advanced Customization**

### **Variables (Dynamic Filters)**
1. **Dashboard Settings** → **Variables**
2. **Add Variable**:
   - Name: `namespace`
   - Type: `Query`
   - Query: `label_values(up, kubernetes_namespace)`
   - Refresh: `On Dashboard Load`

3. **Use in queries**:
   ```promql
   up{kubernetes_namespace="$namespace"}
   ```

### **Annotations (Event Markers)**
1. **Dashboard Settings** → **Annotations**
2. **Add Annotation**:
   - Name: "Deployments"
   - Query: `changes(app_version[1m]) > 0`
   - Icon Color: Blue

### **Thresholds and Alerts**
1. **Panel Edit** → **Field tab**
2. **Thresholds**:
   - Red: 0 (unhealthy)
   - Yellow: 0.5 (warning)
   - Green: 1 (healthy)

## **📝 Custom PromQL Queries**

### **Basic Metrics**
```promql
# Pod health
up{job="kubernetes-pods"}

# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_errors_total[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### **Business Metrics**
```promql
# Game scores by difficulty
sum(game_scores_total) by (difficulty)

# Active games
active_games_current

# User accuracy
game_accuracy_rate

# Unique users
unique_users_total
```

### **Infrastructure Metrics**
```promql
# Memory usage (MB)
container_memory_usage_bytes / 1024 / 1024

# CPU usage
rate(container_cpu_usage_seconds_total[5m])

# Database connections
database_connections_current

# Redis cache hit rate
redis_cache_hit_rate
```

## **🎨 Dashboard Design Best Practices**

### **Layout Guidelines**
- **Top row**: Key metrics and alerts (12x8 panels)
- **Middle rows**: Performance graphs (12x8 or 6x8 panels)
- **Bottom rows**: Detailed breakdowns (6x8 panels)

### **Color Schemes**
- **Green**: Healthy, good performance
- **Yellow**: Warning, attention needed
- **Red**: Critical, immediate action required
- **Blue**: Informational, neutral

### **Refresh Rates**
- **Real-time**: 5-15 seconds (for active monitoring)
- **Standard**: 30-60 seconds (for most dashboards)
- **Historical**: 5-15 minutes (for trend analysis)

## **🔍 Troubleshooting Custom Dashboards**

### **Common Issues**

#### **1. "No Data" in Panels**
- **Check**: Data source connection
- **Verify**: PromQL query syntax
- **Test**: Query in Prometheus directly

#### **2. Wrong Time Range**
- **Check**: Dashboard time picker
- **Verify**: Panel time override settings
- **Adjust**: Time range in top-right

#### **3. Missing Metrics**
- **Check**: Prometheus targets
- **Verify**: Metric names in Prometheus
- **Test**: `up` metric first

### **Debugging Steps**
1. **Test query in Prometheus**: http://localhost:9090
2. **Check data source**: Verify Prometheus connection
3. **Validate PromQL**: Use Prometheus query editor
4. **Check time range**: Ensure data exists for selected time

## **📚 Example Dashboard Templates**

### **Template 1: Basic Monitoring**
- Pod Status (Stat)
- Request Rate (Time Series)
- Error Rate (Time Series)
- Memory Usage (Time Series)

### **Template 2: Performance Dashboard**
- Response Time (Heatmap)
- Throughput (Time Series)
- Error Distribution (Pie Chart)
- Resource Usage (Gauge)

### **Template 3: Business Dashboard**
- Game Scores (Stat)
- User Engagement (Time Series)
- Performance Metrics (Gauge)
- System Health (Stat)

## **🚀 Next Steps**

1. **Import the example dashboards**
2. **Modify panels** to match your needs
3. **Add custom metrics** using the PromQL examples
4. **Create variables** for dynamic filtering
5. **Set up alerts** based on thresholds
6. **Share dashboards** with your team

## **💡 Pro Tips**

- **Start simple**: Begin with basic panels and add complexity
- **Use variables**: Make dashboards reusable across environments
- **Test queries**: Always verify PromQL in Prometheus first
- **Document**: Add descriptions to panels and dashboards
- **Iterate**: Continuously improve based on usage patterns

Your custom dashboards are now ready to monitor your Humor Memory Game with production-grade insights! 🎮📊
