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

# Frontend runs on http://localhost:8080
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
| **Frontend** | http://localhost:8080 | Game UI (dev server) |
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

## 🎮 Ready to Code!

Your development environment is now ready:

1. **Backend** auto-reloads on changes in `backend/`
2. **Frontend** serves from `frontend/src/`
3. **Database** persists data between restarts
4. **Tests** ensure everything works correctly

Happy coding! 🚀✨