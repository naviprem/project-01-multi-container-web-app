# Project 1: Multi-Container Web Application with Service Discovery

## Goal
Deploy a 3-tier web application (frontend, backend, database) to Kubernetes and understand how containers communicate through Services.

## Learning Objectives
- Create and manage Pods and Deployments
- Configure Services (ClusterIP, NodePort, LoadBalancer)
- Use ConfigMaps for configuration data
- Use Secrets for sensitive data
- Understand service discovery and DNS in Kubernetes
- Deploy to local cluster (Minikube) and cloud (GKE)

## Success Criteria
- Frontend can communicate with backend via service name
- Backend can connect to database using service DNS
- Application is accessible from outside the cluster
- Configuration is externalized using ConfigMaps
- Database credentials are stored in Secrets
- Successfully deployed to both local and GKE clusters

## Tech Stack
- Frontend: nginx serving static HTML/React app
- Backend: Node.js/Python REST API
- Database: PostgreSQL or MongoDB
- Platform: Minikube (local) → GKE (cloud)
