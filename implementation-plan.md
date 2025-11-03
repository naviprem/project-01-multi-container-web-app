# Implementation Plan: Multi-Container Web Application

## Overview
Build a simple 3-tier TODO application with a React frontend, Node.js backend, and MongoDB database.

## Architecture
```
Internet → NodePort/LoadBalancer → Frontend (nginx) → Backend (Node.js API) → Database (MongoDB)
```

## Step-by-Step Implementation

### Phase 1: Local Development (Minikube)

#### Step 1: Setup Environment (15 mins)
```bash
# Install minikube and kubectl
minikube start --driver=docker
kubectl cluster-info
```

#### Step 2: Create Application Code (30 mins)

**Frontend (frontend/)**
- `index.html` - Simple TODO list interface with fetch calls to backend
- `Dockerfile` - nginx serving static files

**Backend (backend/)**
- `server.js` - Express.js API with routes: GET/POST/DELETE /todos
- `package.json` - Dependencies: express, mongoose, cors
- `Dockerfile` - Node.js app

#### Step 3: Build and Push Images (15 mins)
```bash
# Point Docker to minikube's Docker daemon
eval $(minikube docker-env)

# Build images
docker build -t todo-frontend:v1 ./frontend
docker build -t todo-backend:v1 ./backend
```

#### Step 4: Create Kubernetes Manifests (45 mins)

**k8s/mongodb.yaml**
- Deployment: 1 replica, mongo:5 image
- Service: ClusterIP on port 27017
- Secret: mongodb credentials (username/password)

**k8s/backend.yaml**
- Deployment: 2 replicas, todo-backend:v1 image
- Service: ClusterIP on port 3000
- ConfigMap: database name, connection settings
- Environment variables: reference Secret and ConfigMap

**k8s/frontend.yaml**
- Deployment: 2 replicas, todo-frontend:v1 image
- Service: NodePort on port 80 (maps to 30080)
- ConfigMap: backend API URL

#### Step 5: Deploy to Minikube (20 mins)
```bash
# Apply in order
kubectl apply -f k8s/mongodb-secret.yaml
kubectl apply -f k8s/mongodb-configmap.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/backend-configmap.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend-configmap.yaml
kubectl apply -f k8s/frontend.yaml

# Verify
kubectl get pods
kubectl get services

# Access application
minikube service frontend --url
```

#### Step 6: Test Service Discovery (15 mins)
```bash
# Exec into backend pod
kubectl exec -it <backend-pod> -- sh

# Test DNS resolution
nslookup mongodb
nslookup backend

# Test connectivity
curl http://mongodb:27017
```

### Phase 2: Deploy to GKE (1 hour)

#### Step 7: Setup GKE Cluster (20 mins)
```bash
# Create GKE cluster
gcloud container clusters create todo-cluster \
  --zone us-central1-a \
  --num-nodes 2 \
  --machine-type e2-small

# Get credentials
gcloud container clusters get-credentials todo-cluster --zone us-central1-a
```

#### Step 8: Push Images to GCR (15 mins)
```bash
# Tag images for GCR
docker tag todo-frontend:v1 gcr.io/[PROJECT-ID]/todo-frontend:v1
docker tag todo-backend:v1 gcr.io/[PROJECT-ID]/todo-backend:v1

# Push to GCR
docker push gcr.io/[PROJECT-ID]/todo-frontend:v1
docker push gcr.io/[PROJECT-ID]/todo-backend:v1
```

#### Step 9: Update Manifests for GKE (10 mins)
- Update image references to use GCR
- Change frontend Service type to LoadBalancer

#### Step 10: Deploy to GKE (15 mins)
```bash
# Apply manifests
kubectl apply -f k8s/

# Get LoadBalancer IP
kubectl get service frontend
# Wait for EXTERNAL-IP to be assigned

# Test application
curl http://<EXTERNAL-IP>
```

## Project Structure
```
project-01-multi-container-web-app/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── Dockerfile
├── backend/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── k8s/
│   ├── mongodb-secret.yaml
│   ├── mongodb-configmap.yaml
│   ├── mongodb.yaml
│   ├── backend-configmap.yaml
│   ├── backend.yaml
│   ├── frontend-configmap.yaml
│   └── frontend.yaml
└── README.md
```

## Key Kubernetes Concepts Demonstrated

1. **Pods & Deployments**: Managing containerized applications
2. **Services**:
   - ClusterIP for internal communication (backend, database)
   - NodePort for local access (minikube)
   - LoadBalancer for cloud access (GKE)
3. **Service Discovery**: DNS-based service resolution
4. **ConfigMaps**: Non-sensitive configuration (URLs, settings)
5. **Secrets**: Sensitive data (database credentials)
6. **Environment Variables**: Injecting config into containers

## Testing Checklist

- [ ] Frontend loads in browser
- [ ] Can create a TODO item
- [ ] Can view TODO items (data from database)
- [ ] Can delete TODO items
- [ ] Backend logs show MongoDB connection
- [ ] Services resolve by DNS name
- [ ] Application works on both Minikube and GKE

## Cleanup
```bash
# Minikube
minikube delete

# GKE
kubectl delete -f k8s/
gcloud container clusters delete todo-cluster --zone us-central1-a
```

## Time Estimate
- Local (Minikube): 2-3 hours
- GKE deployment: 1 hour
- **Total: 3-4 hours**
