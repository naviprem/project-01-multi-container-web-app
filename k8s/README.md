# Project setup in local minikube

- First, setup k8s by following instructions in [k8s-setup.md](setup/k8s-setup.md)
- Build Frontend Image

```bash
cd frontend

docker build -t todo-frontend:v1 .

# Verify image
docker images | grep todo-frontend

cd ..
```

- Build Backend Image

```bash
cd backend

# First create package-lock.json
npm install

docker build -t todo-backend:v1 .

# Verify image
docker images | grep todo-backend

cd ..
```

- Test Images Locally

```bash
# Run backend
docker run -d --name test-backend -p 3000:3000 todo-backend:v1

# Test backend
curl http://localhost:3000/health

# Stop test container
docker stop test-backend
docker rm test-backend
```

- Apply the secret:

```bash
kubectl apply -f mongodb-secret.yaml

# Verify secret created
kubectl get secrets
kubectl describe secret mongodb-secret
```

- Apply the ConfigMap:

```bash
kubectl apply -f mongodb-configmap.yaml

# Verify
kubectl get configmap mongodb-config
kubectl describe configmap mongodb-config
```

- Apply MongoDB:

```bash
kubectl apply -f mongodb.yaml

# Watch pods come up
kubectl get pods -w
# Press Ctrl+C when mongodb pod is Running

# Check logs
kubectl logs -l app=mongodb

# Verify service
kubectl get service mongodb

# Test MongoDB connection
kubectl exec -it deployment/mongodb -- mongosh -u admin -p secretpassword123 --authenticationDatabase admin --eval "db.adminCommand('ping')"
```

- Apply backend configmap

```bash
kubectl apply -f backend-configmap.yaml
```

- Apply backend

```bash
kubectl apply -f backend.yaml

# To restart backend deployment
kubectl rollout restart deployment/backend

# Wait for pods
kubectl get pods -l app=backend -w
# Press Ctrl+C when both backend pods are Running

# Check logs
kubectl logs -l app=backend --tail=50

# Verify backend is healthy
kubectl port-forward service/backend 3000:3000 &
curl http://localhost:3000/health
# Should return: {"status":"healthy","mongodb":"connected",...}

# Stop port-forward
pkill -f "port-forward service/backend"
```

- Apply frontend config mapp
 
```bash
kubectl apply -f frontend-configmap.yaml
```

- Apply frontend

```bash
kubectl apply -f frontend.yaml

# Wait for pods
kubectl get pods -l app=frontend -w
# Press Ctrl+C when both frontend pods are Running

# Verify service
kubectl get service frontend
```

- Test DNS Resolution

```bash
# Create a test pod
kubectl run test-pod --image=busybox --rm -it --restart=Never -- sh

# Inside the pod, run:
nslookup mongodb
nslookup backend
nslookup frontend

# Test connectivity
wget -O- http://backend:3000/health
wget -O- http://frontend

# Exit pod (it will be auto-deleted)
exit
```

- Test Backend from Inside Cluster

```bash
# Port-forward to backend
kubectl port-forward service/backend 3000:3000 &

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/todos
# Should return empty array: []

# Add a todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"text":"Test from kubectl"}'

# Verify it was added
curl http://localhost:3000/todos
# Should return array with one todo

# Stop port-forward
pkill -f "port-forward service/backend"
```