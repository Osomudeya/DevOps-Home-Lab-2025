# 🚀 Running Humor Memory Game Locally with NPM

## 📋 Prerequisites

- **Node.js 18+** (`node --version`)
- **NPM 8+** (`npm --version`)
- **PostgreSQL 15+** (running locally or Docker)
- **Redis 7+** (running locally or Docker)

## 🎯 Quick Start (3 Options)

### Option 1: 🐳 Full Docker Setup (Recommended)
```bash
# Clone and setup
git clone <your-repo>
cd humor-memory-game
cp .env.example .env

# Start everything with Docker
docker-compose up --build

# Access:
# - Game: http://localhost:3000
# - API: http://localhost:3001
```

### Option 1.5: 🐳 Docker Setup with Makefile (Enhanced)
```bash
# Clone and setup
git clone <your-repo>
cd humor-memory-game
cp .env.example .env

# Use Makefile for enhanced Docker management
make setup          # Initial setup and environment check
make build          # Build all Docker images
make dev            # Start development environment
make health         # Check service health
make logs           # View all service logs

# Or use the quick command
make deploy-local   # Setup + build + start everything

# Access:
# - Game: http://localhost:3000
# - API: http://localhost:3001
# - Nginx: http://localhost:80
```

### Option 2: 🔧 Automated Dev Setup
```bash
# Use the automated setup script
./scripts/dev-setup.sh

# This will:
# - Install all dependencies
# - Start PostgreSQL/Redis via Docker
# - Start backend and frontend dev servers
# - Create stop script
```

### Option 3: 🛠️ Manual NPM Development

#### Step 1: Setup Database Services
```bash
# Start only database services via Docker
docker-compose up -d postgres redis

# Or use your local PostgreSQL/Redis
# Make sure they're running on default ports
```

#### Step 2: Setup Environment
```bash
cp .env.example .env
# Edit .env file with your database credentials
```

#### Step 3: Install Dependencies
```bash
# Backend dependencies
cd backend
npm install
cd ..

# Frontend dependencies (minimal for vanilla JS)
cd frontend
npm install
cd ..
```

#### Step 4: Run Backend Server
```bash
cd backend
npm run dev
# Backend API will run on http://localhost:3001
```

#### Step 5: Run Frontend Server (separate terminal)
```bash
cd frontend
npm run dev
# Frontend will run on http://localhost:8080
```

## 📁 NPM Scripts Available

### Backend (`backend/package.json`)
```bash
cd backend

# Development (with auto-reload)
npm run dev

# Production
npm start

# Run tests
npm test
npm run test:watch

# Database operations
npm run db:migrate
npm run db:seed

# Code quality
npm run lint
npm run format
```

### Frontend (`frontend/package.json`)
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Production server
npm start

# Clean build directory
npm run clean

# Run tests (when added)
npm test
```

### Root Level Tests
```bash
# Run all tests from project root
npm test

# Run API tests specifically
cd tests
npm test api.test.js
```

## 🔧 Development Workflow

### 1. Backend Development
```bash
# Terminal 1: Start database services
docker-compose up -d postgres redis

# Terminal 2: Start backend with hot reload
cd backend
npm run dev

# Backend runs on http://localhost:3001
# API endpoints: http://localhost:3001/api
# Health check: http://localhost:3001/health
```

### 2. Frontend Development
```bash
# Terminal 3: Start frontend dev server
cd frontend
npm run dev

# Frontend runs on http://localhost:3002
# Auto-reloads on file changes in frontend/src/
```

### 3. Full Stack Testing
```bash
# Terminal 4: Run tests
npm test

# Or run specific test files
npx jest tests/api.test.js
```

## 🌐 Access Points During Development

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3002 | Game UI (dev server) |
| **Backend API** | http://localhost:3001 | API endpoints |
| **Full Stack** | http://localhost:3000 | Complete app (Docker) |
| **Database** | localhost:5432 | PostgreSQL |
| **Cache** | localhost:6379 | Redis |

## 🐛 Development Tips

### Hot Reloading
- **Backend**: Uses `nodemon` - auto-restarts on file changes
- **Frontend**: Uses Python HTTP server - manual refresh needed

### API Testing
```bash
# Test backend API directly
curl http://localhost:3001/health
curl http://localhost:3001/api

# Test with frontend
# Open http://localhost:8080 and play the game
```

### Database Management
```bash
# Connect to database
docker-compose exec postgres psql -U gameuser -d humor_memory_game

# View tables
\dt

# Check Redis
docker-compose exec redis redis-cli
> keys *
> get leaderboard:top
```

### Logs and Debugging
```bash
# Backend logs (if using dev-setup.sh)
tail -f logs/backend.log

# Frontend logs (if using dev-setup.sh)
tail -f logs/frontend.log

# Docker service logs
docker-compose logs backend
docker-compose logs frontend
```

## 🛑 Stop Development Servers

### If using dev-setup.sh:
```bash
./scripts/stop-dev.sh
```

### Manual cleanup:
```bash
# Stop NPM processes (Ctrl+C in each terminal)
# Stop Docker services
docker-compose down
```

## 🧪 Testing

### Run All Tests
```bash
# From project root
npm test
```

### Backend API Tests
```bash
cd backend
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Manual API Testing
```bash
# Health check
curl -X GET http://localhost:3001/health

# Create user
curl -X POST http://localhost:3001/api/scores/user \
  -H "Content-Type: application/json" \
  -d '{"username": "testplayer"}'

# Start game
curl -X POST http://localhost:3001/api/game/start \
  -H "Content-Type: application/json" \
  -d '{"username": "testplayer", "difficulty": "easy"}'
```

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check if ports are in use
lsof -i :3001
lsof -i :5432
lsof -i :6379

# Check database connection
docker-compose ps postgres
docker-compose logs postgres
```

### Frontend won't connect to backend
```bash
# Check API_BASE_URL in frontend/public/index.html
# Should be: window.API_BASE_URL = 'http://localhost:3001/api';

# Test API connectivity
curl http://localhost:3001/api
```

### Database connection errors
```bash
# Check .env file
cat .env | grep DB_

# Reset database
docker-compose down
docker volume rm humor-memory-game_postgres_data
docker-compose up -d postgres
```

### Permission errors
```bash
# Fix script permissions
chmod +x scripts/*.sh

# Fix npm permissions (if needed)
sudo chown -R $(whoami) ~/.npm
```

### Makefile errors
```bash
# Check if Makefile exists
ls -la Makefile

# Check Makefile syntax
make help

# Common Makefile issues:
# - "No rule to make target": Check target name spelling
# - "Permission denied": Run chmod +x deploy-k8s.sh
# - "Command not found": Ensure make is installed (brew install make)

# Reset Makefile state
make clean
make setup
```

## 🎮 Ready to Code!

Your development environment is now ready:

1. **Backend** auto-reloads on changes in `backend/`
2. **Frontend** serves from `frontend/src/`
3. **Database** persists data between restarts
4. **Tests** ensure everything works correctly

---

## 🛠️ **MAKEFILE COMMANDS REFERENCE**

### **🚀 Quick Commands**
```bash
make help              # Show all available commands
make setup             # Initial project setup
make dev               # Start development environment
make prod              # Start production environment
make deploy-local      # Setup + build + start everything
```

### **🏗️ Build Commands**
```bash
make build             # Build all Docker images
make build-backend     # Build only backend image
make build-frontend    # Build only frontend image
make clean             # Clean up containers, volumes, and images
```

### **📊 Management Commands**
```bash
make start             # Start all services
make stop              # Stop all services
make restart           # Restart all services
make status            # Show service status
make health            # Check service health
make logs              # View all service logs
make logs-backend      # View backend logs only
make logs-frontend     # View frontend logs only
make logs-db           # View database logs only
```

### **🔧 Development Commands**
```bash
make shell-backend     # Access backend container shell
make shell-db          # Access database shell
make backup            # Create database backup
make restore           # Restore database from backup
make update            # Update and restart services
```

### **🧪 Testing Commands**
```bash
make test              # Run all tests
make test-api          # Test API endpoints
make lint              # Lint code
make format            # Format code
```

### **📁 Makefile Structure**
```bash
# Key targets in your Makefile:
setup:                 # Initial project setup
dev:                   # Development environment
prod:                  # Production environment
build:                 # Build Docker images
deploy-local:          # Local deployment
health:                # Health checks
logs:                  # Log viewing
clean:                 # Cleanup
```

### **🎯 Makefile Workflow Examples**

#### **Complete Development Setup**
```bash
# 1. Initial setup
make setup

# 2. Build and start
make dev

# 3. Check health
make health

# 4. View logs
make logs
```

#### **Production Testing**
```bash
# 1. Start production environment
make prod

# 2. Verify production setup
make health

# 3. Check production logs
make logs
```

#### **Quick Reset**
```bash
# 1. Stop everything
make stop

# 2. Clean up
make clean

# 3. Start fresh
make dev
```

#### **Backend Development**
```bash
# 1. Start services
make dev

# 2. Access backend shell
make shell-backend

# 3. View backend logs
make logs-backend

# 4. Restart backend only
make restart
```

### **🔍 Makefile Features**

- **🔄 Auto-rebuild**: Images rebuild automatically when needed
- **📊 Health monitoring**: Built-in health checks for all services
- **📝 Log aggregation**: Easy access to all service logs
- **🐚 Shell access**: Quick access to container shells
- **💾 Backup/restore**: Database backup and restore commands
- **🧹 Cleanup**: Complete cleanup and reset functionality

---

Happy coding! 🚀✨