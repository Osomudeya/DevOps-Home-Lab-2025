# 📚 Documentation Index

This directory contains comprehensive guides and documentation for the Humor Memory Game Kubernetes deployment.

## 🚀 Available Guides

### [Security Contexts Guide](security-contexts-guide.md)
**Complete guide to Kubernetes security contexts and production security hardening**

- What are security contexts and why they matter
- Real attack scenarios and how security contexts prevent them
- Step-by-step configuration examples
- Verification commands and best practices
- Enterprise security benefits and compliance

## 🎯 How to Use These Guides

1. **Start with the main guide**: `home-lab.md` in the root directory
2. **Dive deeper** into specific topics using these detailed guides
3. **Follow the examples** to implement security features in your own clusters
4. **Reference the best practices** for production deployments

## 🔗 Related Documentation

- **Main Guide**: [`../home-lab.md`](../home-lab.md) - Complete homelab setup
- **Kubernetes Manifests**: [`../k8s/`](../k8s/) - All deployment configurations
- **Docker Compose**: [`../docker-compose.yml`](../docker-compose.yml) - Local development setup

## 📖 Learning Path

1. **Milestone 0**: Environment setup and tool verification
2. **Milestone 1**: Docker Compose application deployment
3. **Milestone 2**: Kubernetes core deployment
4. **Milestone 3**: Production-grade features and security hardening

## 🆘 Need Help?

- Check the troubleshooting sections in each guide
- Verify your Kubernetes cluster is running: `kubectl get nodes`
- Check pod status: `kubectl get pods -n humor-game`
- Review logs: `kubectl logs -l app=backend -n humor-game`
