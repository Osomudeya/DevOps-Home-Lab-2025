#!/bin/bash

# Quick Setup Script for Humor Memory Game
# This script automates the entire setup process

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}🎮 HUMOR MEMORY GAME - QUICK SETUP 😂${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Configuration
ENVIRONMENT="${1:-}"
GITHUB_REPO="${2:-}"

usage() {
    echo "Usage: $0 ENVIRONMENT [GITHUB_REPO]"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT    Environment to setup (dev/prod)"
    echo "  GITHUB_REPO    GitHub repository (org/repo) - will prompt if not provided"
    echo ""
    echo "Example:"
    echo "  $0 dev myorg/humor-memory-game"
    echo "  $0 prod"
}

# Validate inputs
if [[ -z "$ENVIRONMENT" ]]; then
    print_error "Environment is required"
    usage
    exit 1
fi

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    print_error "Environment must be 'dev' or 'prod'"
    exit 1
fi

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    # Required tools
    command -v az >/dev/null 2>&1 || missing_tools+=("azure-cli")
    command -v terraform >/dev/null 2>&1 || missing_tools+=("terraform")
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install them and run this script again"
        exit 1
    fi
    
    # Check Azure login
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
    
    # Check GitHub CLI (optional but recommended)
    if ! command -v gh &> /dev/null; then
        print_warning "GitHub CLI not found. You'll need to set some secrets manually."
    fi
    
    print_success "Prerequisites check completed"
}

# Get GitHub repository
get_github_repo() {
    if [[ -z "$GITHUB_REPO" ]]; then
        echo -n "Enter GitHub repository (org/repo): "
        read GITHUB_REPO
        
        if [[ -z "$GITHUB_REPO" ]]; then
            print_error "GitHub repository is required"
            exit 1
        fi
    fi
    
    print_status "GitHub repository: $GITHUB_REPO"
}

# Setup Terraform backend
setup_terraform_backend() {
    print_status "Setting up Terraform backend..."
    
    if [[ ! -f "scripts/bootstrap-az.sh" ]]; then
        print_error "Bootstrap script not found. Are you in the project root?"
        exit 1
    fi
    
    # Run bootstrap script
    chmod +x scripts/bootstrap-az.sh
    ./scripts/bootstrap-az.sh
    
    print_success "Terraform backend setup completed"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying infrastructure for $ENVIRONMENT..."
    
    local terraform_dir="infra/envs/${ENVIRONMENT}"
    
    if [[ ! -d "$terraform_dir" ]]; then
        print_error "Terraform directory not found: $terraform_dir"
        exit 1
    fi
    
    cd "$terraform_dir"
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init
    
    # Check if terraform.tfvars exists
    if [[ ! -f "terraform.tfvars" ]]; then
        print_warning "terraform.tfvars not found. Creating template..."
        
        cat > terraform.tfvars << EOF
# Required variables for $ENVIRONMENT environment
my_ip = "$(curl -s ifconfig.me)/32"  # Your current IP

# Optional: Override defaults
# project_name = "humor-game"
# location = "East US 2"

# Required for prod environment
$(if [[ "$ENVIRONMENT" == "prod" ]]; then echo '# admin_group_object_ids = ["your-aad-group-object-id"]'; fi)

# Database password (generate a secure one)
db_password = "$(openssl rand -base64 24)"

# Application secrets (generate secure ones)
jwt_secret = "$(openssl rand -base64 32)"
session_secret = "$(openssl rand -base64 32)"

# Required for prod environment
$(if [[ "$ENVIRONMENT" == "prod" ]]; then echo '# github_repo_url = "https://github.com/'$GITHUB_REPO'"
# github_runner_token = "your-github-runner-token"'; fi)
EOF
        
        print_warning "Please review and update $terraform_dir/terraform.tfvars"
        read -p "Press Enter when ready to continue..."
    fi
    
    # Plan and apply
    print_status "Planning Terraform deployment..."
    terraform plan
    
    echo -e "\n${YELLOW}About to deploy infrastructure for $ENVIRONMENT${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    print_status "Applying Terraform configuration..."
    terraform apply -auto-approve
    
    cd - > /dev/null
    print_success "Infrastructure deployment completed"
}

# Setup GitHub secrets
setup_github_secrets() {
    print_status "Setting up GitHub secrets..."
    
    if [[ ! -f "scripts/setup-github-secrets.sh" ]]; then
        print_error "GitHub secrets setup script not found"
        exit 1
    fi
    
    chmod +x scripts/setup-github-secrets.sh
    
    export GITHUB_REPOSITORY="$GITHUB_REPO"
    
    # Check if we have GitHub token
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        if command -v gh &> /dev/null && gh auth status &> /dev/null; then
            print_status "Using GitHub CLI authentication"
        else
            print_warning "GitHub token not found"
            echo -n "Enter GitHub token (or press Enter to skip): "
            read -s GITHUB_TOKEN
            echo
            
            if [[ -n "$GITHUB_TOKEN" ]]; then
                export GITHUB_TOKEN
            else
                print_warning "Skipping GitHub secrets setup"
                return
            fi
        fi
    fi
    
    ./scripts/setup-github-secrets.sh "$ENVIRONMENT"
    
    print_success "GitHub secrets setup completed"
}

# Setup Key Vault secrets
setup_keyvault_secrets() {
    print_status "Setting up Key Vault secrets..."
    
    # Get Key Vault name from Terraform outputs
    local terraform_dir="infra/envs/${ENVIRONMENT}"
    cd "$terraform_dir"
    
    local key_vault_name
    key_vault_name=$(terraform output -raw key_vault_name)
    
    local postgres_fqdn
    postgres_fqdn=$(terraform output -raw postgres_fqdn)
    
    cd - > /dev/null
    
    if [[ ! -f "scripts/set-secrets.sh" ]]; then
        print_error "Key Vault secrets script not found"
        exit 1
    fi
    
    chmod +x scripts/set-secrets.sh
    ./scripts/set-secrets.sh -e "$ENVIRONMENT" -k "$key_vault_name" -h "$postgres_fqdn"
    
    print_success "Key Vault secrets setup completed"
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Get AKS credentials
    local terraform_dir="infra/envs/${ENVIRONMENT}"
    cd "$terraform_dir"
    
    local resource_group_name
    resource_group_name=$(terraform output -raw resource_group_name)
    
    local aks_cluster_name
    aks_cluster_name=$(terraform output -raw aks_cluster_name)
    
    cd - > /dev/null
    
    # Get AKS credentials
    az aks get-credentials \
        --resource-group "$resource_group_name" \
        --name "$aks_cluster_name" \
        --overwrite-existing
    
    # Check if cluster is accessible
    if kubectl get nodes > /dev/null 2>&1; then
        print_success "AKS cluster is accessible"
        kubectl get nodes
    else
        print_warning "AKS cluster not accessible yet"
    fi
    
    print_success "Deployment test completed"
}

# Display summary
display_summary() {
    print_success "🎉 Setup completed for $ENVIRONMENT environment!"
    echo
    echo -e "${BLUE}📋 What was done:${NC}"
    echo "✅ Terraform backend configured"
    echo "✅ Infrastructure deployed"
    echo "✅ GitHub secrets configured"
    echo "✅ Key Vault secrets set"
    echo "✅ AKS cluster accessible"
    echo
    echo -e "${BLUE}🚀 Next steps:${NC}"
    echo "1. Push code to trigger GitHub Actions build"
    echo "2. Deploy using GitHub Actions workflow"
    echo "3. Test your application"
    echo
    echo -e "${BLUE}🛠️ Useful commands:${NC}"
    echo "kubectl get pods -n humor-game"
    echo "kubectl logs -l app.kubernetes.io/name=humor-memory-game -n humor-game"
    echo "kubectl port-forward svc/humor-game-service 8080:3001 -n humor-game"
    echo
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo "See DEPLOYMENT-ISSUES-AND-FIXES.md for troubleshooting"
    echo
}

# Main execution
main() {
    print_header
    
    check_prerequisites
    get_github_repo
    setup_terraform_backend
    deploy_infrastructure
    setup_github_secrets
    setup_keyvault_secrets
    test_deployment
    display_summary
}

# Handle script interruption
trap 'print_error "Setup interrupted"; exit 1' INT TERM

# Run main function
main "$@"