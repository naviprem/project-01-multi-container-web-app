# K8S Setup

- Install Minikube

```bash
# macOS
brew install minikube

# Verify minikube installation
minikube version
which minikube
minikube start
minikube status
```

- Install eksctl

```bash
brew tap weaveworks/tap
brew install weaveworks/tap/eksctl
eksctl version
```

- Install kubectl

```bash
brew install kubectl
kubectl version --client
```

- Start Minikube

```bash
# Start Minikube with Docker driver
minikube start --driver=docker --cpus=2 --memory=4096

# Verify cluster is running
kubectl cluster-info

kubectl get nodes
```

- Configure Docker to Use Minikube's Docker Daemon

```bash
# This allows us to build images directly in Minikube
# configures your terminal to point to Minikube's Docker daemon instead of Docker Desktop
eval $(minikube docker-env)

# to unset
eval $(minikube docker-env --unset)
# Or simply close and reopen your terminal.


# Verify
docker ps | grep kube
# You should see Kubernetes system containers
```
