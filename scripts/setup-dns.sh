#!/bin/bash

# DNS Setup Script for Humor Memory Game
# This script helps configure DNS records for Cloudflare

set -e

echo "🌐 DNS Setup for Humor Memory Game"
echo "=================================="

# Check if required tools are available
if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl first."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "❌ jq not found. Please install jq first."
    exit 1
fi

# Configuration
DOMAIN="gameapp.games"
CLOUDFLARE_ZONE_ID=""
CLOUDFLARE_API_TOKEN=""

echo ""
echo "📋 Before running this script, you need:"
echo "   1. A Cloudflare account with a domain"
echo "   2. Your Cloudflare Zone ID"
echo "   3. An API token with DNS:Edit permissions"
echo ""

# Get Zone ID
if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo "🔍 Please enter your Cloudflare Zone ID:"
    read -p "Zone ID: " CLOUDFLARE_ZONE_ID
fi

# Get API Token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "🔑 Please enter your Cloudflare API Token:"
    read -s -p "API Token: " CLOUDFLARE_API_TOKEN
    echo ""
fi

echo ""
echo "✅ Configuration loaded"
echo "🌐 Domain: $DOMAIN"
echo "🏢 Zone ID: $CLOUDFLARE_ZONE_ID"
echo ""

# Function to create DNS record
create_dns_record() {
    local record_type=$1
    local name=$2
    local content=$3
    local ttl=$4
    
    echo "📝 Creating $record_type record for $name..."
    
    local json_data=$(cat <<EOF
{
    "type": "$record_type",
    "name": "$name",
    "content": "$content",
    "ttl": $ttl,
    "proxied": true
}
EOF
)
    
    local response=$(curl -s -X POST \
        "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "$json_data")
    
    if echo "$response" | jq -e '.success' > /dev/null; then
        echo "✅ $record_type record created successfully"
    else
        echo "❌ Failed to create $record_type record:"
        echo "$response" | jq -r '.errors[0].message'
    fi
}

# Function to list existing records
list_dns_records() {
    echo "📋 Existing DNS records for $DOMAIN:"
    echo "====================================="
    
    local response=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
    
    if echo "$response" | jq -e '.success' > /dev/null; then
        echo "$response" | jq -r '.result[] | "\(.type) \(.name) → \(.content) (TTL: \(.ttl))"'
    else
        echo "❌ Failed to fetch DNS records"
        echo "$response" | jq -r '.errors[0].message'
    fi
}

# Main menu
while true; do
    echo ""
    echo "🎯 Choose an action:"
    echo "   1. List existing DNS records"
    echo "   2. Create A record (for direct IP access)"
    echo "   3. Create CNAME record (for subdomain)"
    echo "   4. Create TXT record (for verification)"
    echo "   5. Exit"
    echo ""
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            list_dns_records
            ;;
        2)
            echo ""
            read -p "Enter IP address: " ip_address
            create_dns_record "A" "$DOMAIN" "$ip_address" 1
            ;;
        3)
            echo ""
            read -p "Enter subdomain (e.g., 'game' for game.$DOMAIN): " subdomain
            read -p "Enter target domain: " target
            create_dns_record "CNAME" "$subdomain.$DOMAIN" "$target" 1
            ;;
        4)
            echo ""
            read -p "Enter TXT record content: " txt_content
            create_dns_record "TXT" "$DOMAIN" "$txt_content" 1
            ;;
        5)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please enter 1-5."
            ;;
    esac
done
