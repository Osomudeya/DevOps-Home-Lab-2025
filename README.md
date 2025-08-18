# 🎮 Humor Memory Game - DevOps Learning Edition 😂

A beginner-friendly full-stack memory card game featuring hilarious emojis and jokes, designed specifically for learning DevOps practices and cloud deployment.

## 🎯 Overview

This application demonstrates modern DevOps practices through a fun, interactive memory game. Perfect for learning containerization, orchestration, CI/CD, monitoring, and cloud deployment concepts.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Node.js App   │    │   PostgreSQL    │
│  (Load Balancer)│◄──►│   (Express.js)  │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │      Redis      │
                       │     (Cache)     │
                       └─────────────────┘
```

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Reverse Proxy**: Nginx
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes (AKS)
- **Infrastructure**: Terraform
- **CI/CD**: GitHub Actions

## 🎮 Game Features

- 🃏 **Memory Card Game** with 4 difficulty levels
- 😂 **30+ Funny Emojis** across multiple categories
- 🏆 **Real-time Leaderboard** with global rankings
- 🎖️ **Achievement System** with unlockable badges
- 📊 **Detailed Statistics** and performance tracking
- ⚡ **Speed Bonuses** and streak multipliers
- 📱 **Responsive Design** for all devices
- ♿ **Accessibility Features** (keyboard navigation, screen readers)

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/humor-memory-game.git
cd humor-memory-game

# Copy environment configuration
cp .env.example .env

# Start all services
docker-compose up --build

# Access the game
open http://localhost:3000
```

### Production Deployment

```bash
# Deploy to production with nginx
docker-compose -f docker-compose.prod.yml up -d

# Or deploy to Kubernetes
kubectl apply -f k8s/
```

## 📁 Project Structure

```
humor-memory-game/
├── frontend/              # React/Vue/Angular app
│   ├── package.json
│   ├── src/
│   └── dist/
├── backend/               # Node.js API only
│   ├── package.json
│   └── src/
└── docker-compose.yml     # Separate containers
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_NAME=humor_memory_game
DB_USER=gameuser
DB_PASSWORD=secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

### Game Configuration

Modify `server/utils/gameData.js` to customize:
- Emoji sets and categories
- Difficulty levels and scoring
- Success/failure messages
- Achievement criteria

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load testing
npm run test:load

# Security testing
npm run test:security
```

## 📊 Monitoring & Observability

### Health Checks
- Application: `GET /health`
- Database: Built-in connection monitoring
- Redis: Automatic health checks
- Nginx: `GET /nginx-status`

### Logging
- Application logs: JSON structured
- Access logs: Nginx format
- Error tracking: Built-in error handlers
- Performance metrics: Response time tracking

### Metrics
- Game statistics in PostgreSQL
- Cache hit ratios in Redis
- Request metrics via Nginx
- Custom business metrics

## 🔒 Security Features

- 🛡️ **Security Headers** (CSP, HSTS, XSS Protection)
- 🚫 **Rate Limiting** (API and login endpoints)
- 🔍 **Input Validation** (Joi schemas)
- 🔐 **SQL Injection Protection** (Parameterized queries)
- 🌐 **CORS Configuration** (Controlled origins)
- 🔒 **SSL/TLS Termination** (Let's Encrypt)

## 🚢 Deployment Options

### Docker Compose (Development)
```bash
docker-compose up --build
```

### Kubernetes (Production)
```bash
# Apply all manifests
kubectl apply -f k8s/

# Or use Helm (if chart available)
helm install humor-game ./helm-chart
```

### Cloud Platforms

#### Azure (AKS)
```bash
# Using Terraform
cd terraform/
terraform init
terraform plan
terraform apply
```

#### AWS (EKS)
```bash
# Modify terraform/main.tf for AWS
terraform apply -var="cloud_provider=aws"
```

#### Google Cloud (GKE)
```bash
# Modify terraform/main.tf for GCP
terraform apply -var="cloud_provider=gcp"
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

1. **Continuous Integration** (`.github/workflows/ci.yml`)
   - Code quality checks (ESLint, Prettier)
   - Security scanning (npm audit, Snyk)
   - Unit and integration tests
   - Docker image building

2. **Continuous Deployment** (`.github/workflows/cd.yml`)
   - Deploy to staging environment
   - Run smoke tests
   - Deploy to production (manual approval)
   - Post-deployment verification

3. **Security Scanning** (`.github/workflows/security-scan.yml`)
   - Container image scanning
   - Dependency vulnerability checks
   - SAST/DAST security testing

### Deployment Strategies

- **Blue-Green**: Zero-downtime deployments
- **Rolling Updates**: Gradual service updates
- **Canary Releases**: Feature flag deployments

## 📈 Performance Optimization

### Caching Strategy
- **Redis**: Leaderboard, user statistics, game sessions
- **Nginx**: Static asset caching
- **Browser**: Asset caching headers
- **Database**: Query optimization and indexing

### Scaling Considerations
- **Horizontal**: Multiple app instances
- **Database**: Read replicas, connection pooling
- **Cache**: Redis clustering
- **CDN**: Static asset distribution

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres
```

**Redis Connection Failed**
```bash
# Test Redis connectivity
docker-compose exec redis redis-cli ping
```

**Application Won't Start**
```bash
# Check application logs
docker-compose logs app

# Verify environment variables
docker-compose exec app env | grep -E "(DB_|REDIS_)"
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=humor-game:*
docker-compose up
```

## 📚 Learning Resources

This project demonstrates:

### DevOps Concepts
- Containerization with Docker
- Orchestration with Kubernetes
- Infrastructure as Code (Terraform)
- CI/CD with GitHub Actions
- Monitoring and Observability
- Security Best Practices

### Development Practices
- RESTful API Design
- Database Design and Optimization
- Caching Strategies
- Error Handling and Logging
- Testing Strategies
- Code Quality and Linting

### Cloud Technologies
- Container Registries
- Managed Databases
- Load Balancers
- Auto-scaling
- Service Mesh
- Serverless Functions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Follow semantic versioning

## 🔐 Security

For security issues, please email: security@gameapp.games

Do not open public issues for security vulnerabilities.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Acknowledgments

- **DevOps Community** for best practices and patterns
- **Open Source Contributors** for amazing tools and libraries
- **Game Testers** for feedback and bug reports
- **Emoji Unicode Consortium** for the hilarious emojis! 😂

## 📞 Support

- 📧 **Email**: support@gameapp.games
- 💬 **Discord**: [Game Community](https://discord.gg/gameapp)
- 📚 **Documentation**: [docs.gameapp.games](https://docs.gameapp.games)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-org/humor-memory-game/issues)

---

**Built with ❤️ for DevOps learning and lots of 😂 for fun!**

🎮 **Happy Gaming & Happy DevOps!** 🚀