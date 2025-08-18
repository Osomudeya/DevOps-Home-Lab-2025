# =================================
# Humor Memory Game - DevOps Edition
# =================================

.PHONY: help setup dev prod test clean build deploy health logs backup

# Default target
.DEFAULT_GOAL := help

# Environment variables
ENV_FILE := .env
COMPOSE_PROJECT_NAME := humor-memory-game
DOMAIN_NAME := gameapp.games

help: ## 📖 Show this help message
	@echo '🎮 Humor Memory Game - DevOps Learning Edition'
	@echo ''
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Initial project setup
	@echo "🎮 Setting up Humor Memory Game development environment..."
	@if [ ! -f $(ENV_FILE) ]; then \
		cp .env.example $(ENV_FILE); \
		echo "📁 Created .env file from .env.example"; \
	fi
	@mkdir -p logs/nginx logs/app
	@mkdir -p nginx/ssl
	@docker-compose pull
	@echo "✅ Setup complete! Run 'make dev' to start development"

dev: setup ## 🔧 Start development environment
	@echo "🚀 Starting development environment..."
	@docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 10
	@make health
	@echo "🎮 Game available at: http://localhost:3002"
	@echo "📊 API available at: http://localhost:3001"
	@echo "📝 Run 'make logs' to view logs"

prod: setup ## 🏭 Start production environment
	@echo "🏭 Starting production environment..."
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 15
	@make health
	@echo "🎮 Game available at: https://$(gameapp.games)"

test: ## 🧪 Run all tests
	@echo "🧪 Running tests..."
	@docker-compose exec api npm test
	@echo "✅ All tests passed!"

test-api: ## 🔍 Test API endpoints
	@echo "🔍 Testing API endpoints..."
	@curl -f http://localhost:3001/health || echo "❌ API health check failed"
	@curl -f http://localhost:3001/api/cards || echo "❌ Cards endpoint failed"
	@echo "✅ API tests completed"

build: ## 🏗️ Build Docker images
	@echo "🏗️ Building Docker images..."
	@docker-compose build --no-cache
	@echo "✅ Images built successfully!"

deploy-local: dev ## 🚀 Deploy locally (alias for dev)

stop: ## ⏹️ Stop all services
	@echo "⏹️ Stopping services..."
	@docker-compose down
	@echo "✅ Services stopped"

clean: ## 🧹 Clean up containers, volumes, and images
	@echo "🧹 Cleaning up..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@docker volume prune -f
	@echo "✅ Cleanup complete!"

health: ## ❤️ Check service health
	@echo "❤️ Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Service Health Checks:"
	@docker-compose exec postgres pg_isready -U gameuser -d humor_memory_game && echo "✅ PostgreSQL: Healthy" || echo "❌ PostgreSQL: Unhealthy"
	@docker-compose exec redis redis-cli -a gamepass123 ping && echo "✅ Redis: Healthy" || echo "❌ Redis: Unhealthy"
	@curl -s http://localhost:3001/health > /dev/null && echo "✅ API: Healthy" || echo "❌ API: Unhealthy"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend: Healthy" || echo "❌ Frontend: Unhealthy"

logs: ## 📝 Show logs from all services
	@docker-compose logs -f

logs-api: ## 📝 Show API logs only
	@docker-compose logs -f api

logs-backend: ## 📝 Show backend logs only
	@docker-compose logs -f backend

logs-db: ## 📝 Show database logs only
	@docker-compose logs -f postgres

backup: ## 💾 Backup database
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U gameuser -d humor_memory_game > backups/backup-$(shell date +%Y%m%d-%H%M%S).sql
	@echo "✅ Database backup created in backups/"

restore: ## 🔄 Restore database from backup (Usage: make restore BACKUP=filename)
	@echo "🔄 Restoring database from backup..."
	@docker-compose exec -T postgres psql -U gameuser -d humor_memory_game < backups/$(BACKUP)
	@echo "✅ Database restored from $(BACKUP)"

shell-api: ## 🐚 Access API container shell
	@docker-compose exec api sh

shell-backend: ## 🐚 Access backend container shell
	@docker-compose exec backend sh

shell-db: ## 🐚 Access database shell
	@docker-compose exec postgres psql -U gameuser -d humor_memory_game

update: ## 🔄 Update and restart services
	@echo "🔄 Updating services..."
	@git pull
	@docker-compose pull
	@docker-compose up -d --build
	@echo "✅ Services updated and restarted"

ssl-cert: ## 🔒 Generate SSL certificate for local development
	@echo "🔒 Generating SSL certificate for $(DOMAIN_NAME)..."
	@mkdir -p nginx/ssl
	@openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout nginx/ssl/key.pem \
		-out nginx/ssl/cert.pem \
		-subj "/C=US/ST=State/L=City/O=Organization/CN=$(DOMAIN_NAME)"
	@echo "✅ SSL certificate generated in nginx/ssl/"

monitor: ## 📊 Show resource usage
	@echo "📊 Resource usage:"
	@docker stats --no-stream

# Development helpers
install-deps: ## 📦 Install dependencies for local development
	@echo "📦 Installing dependencies..."
	@cd backend && npm install
	@cd frontend && npm install
	@echo "✅ Dependencies installed"

lint: ## 🔍 Lint code
	@echo "🔍 Linting code..."
	@cd backend && npm run lint
	@cd frontend && npm run lint
	@echo "✅ Linting completed"

format: ## ✨ Format code
	@echo "✨ Formatting code..."
	@cd backend && npm run format
	@cd frontend && npm run format
	@echo "✅ Code formatted"