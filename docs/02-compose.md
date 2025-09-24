
# Docker Tutorial: Build Your First Multi-Container App

*Learn containerization by running a real application with multiple services*

## 🎯 **What You'll Learn**

By the end of this tutorial, you'll know how to:
- **Run multiple services** together using Docker Compose
- **Connect databases** to your application
- **Test application functionality** before complex deployment
- **Debug container issues** using logs and health checks

## ⏱️ **Time Required: 20-40 minutes**

## Why This Matters

Docker Compose is like a practice run before the big game. It lets you test your application with multiple services (database, cache, frontend, backend) before deploying to Kubernetes. Think of it as building a house model before constructing the real thing.

**What this means for you**: Many Kubernetes deployment issues start here. If your app doesn't work in Docker Compose, it won't work in Kubernetes either.

ℹ️ **Simple Explanation:** Docker Compose runs multiple containers together on your computer. It's like having a mini data center on your laptop where you can test everything before deploying to the real thing.

## Do This

### Step 1: Clone and Start Your Application

```bash
# Navigate to your project directory
cd /path/to/your/humor-memory-game

# Build all container images
docker compose build
```

**Expected Output:**
```bash
Building backend
Step 1/12 : FROM node:18-alpine
Step 1/12 : FROM node:18-alpine
 ---> 1234567890ab
Step 2/12 : WORKDIR /app
 ---> Using cache
Step 2/12 : WORKDIR /app
 ---> 1234567890ab
...
Successfully built 1234567890ab
Successfully tagged game-app-laptop-demo-backend:latest

Building frontend
Step 1/8 : FROM nginx:alpine
 ---> 0987654321cd
...
Successfully built 0987654321cd
Successfully tagged game-app-laptop-demo-frontend:latest
```

```bash
# Start all services in background
docker compose up -d
```

**Expected Output:**
```bash
Creating network "game-app-laptop-demo_default" ... done
Creating game-app-laptop-demo_postgres_1 ... done
Creating game-app-laptop-demo_redis_1 ... done
Creating game-app-laptop-demo_backend_1 ... done
Creating game-app-laptop-demo_frontend_1 ... done
```

```bash
# Wait for services to initialize (databases need time to start)
sleep 30
```

### Step 2: Verify Services Are Running

```bash
# Check that all containers are running
docker compose ps
```

**Expected Output:**
```bash
NAME                       IMAGE                           STATUS                    PORTS
game-app-laptop-demo_postgres_1   postgres:15-alpine              Up 13 minutes            5432/tcp
game-app-laptop-demo_redis_1      redis:7-alpine                  Up 6 minutes             6379/tcp
game-app-laptop-demo_backend_1    game-app-laptop-demo-backend    Up 13 minutes            0.0.0.0:3001->3001/tcp
game-app-laptop-demo_frontend_1   game-app-laptop-demo-frontend   Up 6 minutes (healthy)   0.0.0.0:3000->80/tcp
```

### Step 3: Test Your Application in Browser

Open your web browser and navigate to `http://localhost:3000`. You should see:

- ✅ **Game interface loads** with the title "Humor Memory Game"
- ✅ **Username input** and difficulty selection work
- ✅ **Start Game button** is clickable
- ✅ **No connection errors** in the browser console (F12 to check)

**Test the full workflow:**
```bash
# Test backend API health
curl http://localhost:3001/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "00:05:23"
}
```

```bash
# Test frontend serves properly
curl http://localhost:3000/
```

**Expected Output:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Humor Memory Game</title>
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <div id="app">
        <h1>Humor Memory Game</h1>
        <!-- Game content -->
    </div>
    <script src="/scripts/game.js"></script>
</body>
</html>
```

```bash
# Test database connectivity
docker compose exec postgres psql -U gameuser -d humor_memory_game -c "SELECT version();"
```

**Expected Output:**
```bash
                                                             version
----------------------------------------------------------------------------------------------------------------
 PostgreSQL 15.4 on x86_64-pc-linux-gnu, compiled by gcc (Alpine 12.2.1_git20220924-r4) 12.2.1 20220924, 64-bit
(1 row)
```

### Step 4: Verify Environment Variables

```bash
# Check environment variables are set correctly
docker compose exec backend env | grep -E "(DB_|REDIS_|NODE_ENV|PORT|API_BASE_URL)"
```

**Expected Output:**
```bash
DB_HOST=postgres
DB_PORT=5432
DB_NAME=humor_memory_game
DB_USER=gameuser
DB_PASSWORD=your_database_password_here
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
NODE_ENV=development
PORT=3001
API_BASE_URL=/api
```

## You Should See...

**Service Status:**
```bash
NAME                       IMAGE                           STATUS                    PORTS
humor-game-postgres        postgres:15-alpine              Up 13 minutes            5432/tcp
humor-game-redis           redis:7-alpine                  Up 6 minutes             6379/tcp
humor-game-backend         game-app-laptop-demo-backend    Up 13 minutes            0.0.0.0:3001->3001/tcp
humor-game-frontend        game-app-laptop-demo-frontend   Up 6 minutes (healthy)   0.0.0.0:3000->80/tcp
```

**Backend Health Check:**
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "timestamp": "2024-08-21T10:00:00.000Z"
}
```

**Frontend Response:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Humor Memory Game</title>
    <!-- Game interface loads without errors -->
</head>
<body>
    <!-- Game content visible -->
</body>
</html>
```

## ✅ Checkpoint

Your Docker Compose application is working when:
- ✅ All 4 containers show "Up" status in `docker compose ps`
- ✅ Frontend loads at `http://localhost:3000` without errors
- ✅ You can start a game and see emoji cards
- ✅ API health endpoint returns success
- ✅ Database connection works
- ✅ Environment variables are properly set

## If It Fails

### Symptom: Containers keep restarting
**Cause:** Health check failures or dependency issues
**Command to confirm:** `docker compose logs postgres` or `docker compose logs redis`
**Fix:**
```bash
# Check logs for the problematic service
docker compose logs backend
docker compose logs postgres

# Common fix: Wait longer for database initialization
docker compose down
docker compose up -d
sleep 60  # Give more time for startup
```

### Symptom: Frontend shows "Cannot connect to game server"
**Cause:** Backend service not accessible
**Command to confirm:** `curl http://localhost:3001/health`
**Fix:**
```bash
# Verify backend is accessible
curl http://localhost:3001/health

# Check backend logs for errors
docker compose logs backend

# Restart just the backend if needed
docker compose restart backend
```

### Symptom: Database connection failed
**Cause:** PostgreSQL not ready or credentials wrong
**Command to confirm:** `docker compose exec postgres psql -U gameuser -d humor_memory_game -c "SELECT 1;"`
**Fix:**
```bash
# Check database logs
docker compose logs postgres

# Verify credentials match docker compose.yml
docker compose exec postgres psql -U gameuser -d humor_memory_game -c "SELECT 1;"

# If still failing, check environment variables
docker compose exec postgres env | grep POSTGRES
```

### Symptom: Redis connection failed
**Cause:** Redis service not ready or password wrong
**Command to confirm:** `docker compose exec redis redis-cli -a your_redis_password_here ping`
**Fix:**
```bash
# Test Redis connectivity
docker compose exec redis redis-cli -a your_redis_password_here ping

# Check Redis logs
docker compose logs redis

# Verify password in docker compose.yml matches
docker compose exec redis redis-cli -a your_redis_password_here ping
```

## 💡 **Reset/Rollback Commands**

If you need to start over or fix issues:

```bash
# Stop all services
docker compose down

# Remove all containers and networks
docker compose down --remove-orphans

# Remove all containers, networks, and volumes (nuclear option)
docker compose down -v --remove-orphans

# Rebuild and restart specific service
docker compose up -d --build backend

# View logs for troubleshooting
docker compose logs -f backend
docker compose logs -f postgres

# Reset database (if corrupted)
docker compose down -v
docker compose up -d postgres
sleep 30
docker compose up -d
```

## Clean Up Before Moving Forward

```bash
# Stop all services (but keep data)
docker compose down

# Verify everything is stopped
docker compose ps
# Should show no running containers
```

## What You Learned

You've confirmed that your application works correctly in containers, including:
- **Multi-service orchestration** with Docker Compose
- **Database connectivity** between application and PostgreSQL (humor_memory_game)
- **Caching integration** with Redis (port 6379)
- **Frontend-backend communication** through nginx proxy (port 80 → 3001)

## Professional Skills Gained

- **Container orchestration** fundamentals
- **Service dependency management** (databases must start before applications)
- **Health check verification** to confirm services are truly ready
- **Debugging containerized applications** using logs and direct testing

---

*Docker Compose milestone completed successfully. All services running and healthy, ready for [03-k8s-basics.md](03-k8s-basics.md).*
