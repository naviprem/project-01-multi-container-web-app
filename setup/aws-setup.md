# AWS Setup

- Install aws cli

```bash
brew install awscli
aws --version
aws configure --profile project-01-eks-deployer
aws sts get-caller-identity --profile project-01-eks-deployer
export AWS_PROFILE=project-01-eks-deployer
```

- Setup env variables

```bash
export AWS_REGION=us-east-1
export CLUSTER_NAME=todo-cluster
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "Cluster Name: $CLUSTER_NAME"
```

- For this project, you need permissions to:

1. Create and manage EKS clusters
2. Create and manage ECR repositories
3. Push Docker images to ECR
4. Create and manage EC2 instances (for EKS worker nodes)
5. Create and manage VPC, subnets, security groups
6. Create and manage Load Balancers
7. Manage IAM roles for EKS

- Create a IAM User with the below permissions
  - `AmazonEKSClusterPolicy`
  - `AmazonEKSWorkerNodePolicy`
  - `AmazonEKS_CNI_Policy`
  - `AmazonEKSServicePolicy`
  - `AmazonEC2ContainerRegistryFullAccess`
  - `AmazonEC2FullAccess`
  - `IAMFullAccess`
  - `AmazonVPCFullAccess`
  - `ElasticLoadBalancingFullAccess`

- List attached policy

```bash
aws iam list-attached-user-policies --user-name project-01-eks-deployer --profile project-01-eks-deployer
```

- Test Permissions

```bash
# Test EKS permissions
aws eks list-clusters --profile project-01-eks-deployer

# Test ECR permissions
aws ecr describe-repositories --profile project-01-eks-deployer

# Test EC2 permissions
aws ec2 describe-instances --profile project-01-eks-deployer

# Test IAM permissions (list roles)
aws iam list-roles --profile project-01-eks-deployer

# Test full cluster creation (dry run)
eksctl create cluster \
  --name test-cluster \
  --region us-east-1 \
  --dry-run
```

- Create the Cluster

```bash
# Create cluster using eksctl (takes 15-20 minutes)
eksctl create cluster -f setup/eks-cluster-config.yaml
```

- Verify Cluster Creation

```bash
# Check cluster status
eksctl get cluster --name todo-cluster --region us-east-1

# Verify kubectl is configured
kubectl config current-context
# Should show: your-user@todo-cluster.us-east-1.eksctl.io

# Check nodes
kubectl get nodes
# Should see 2 nodes in Ready state

# Get cluster info
kubectl cluster-info

# View all contexts
kubectl config get-contexts

# To switch context
kubectl config use-context project-01-eks-deployer@todo-cluster.us-east-1.eksctl.io
```

- Verify AWS Resources

```bash
# Check EKS cluster in AWS
aws eks describe-cluster --name todo-cluster --region us-east-1

# List node groups
eksctl get nodegroup --cluster todo-cluster --region us-east-1

# Check CloudFormation stacks (eksctl uses CFN)
aws cloudformation list-stacks --query "StackSummaries[?contains(StackName, 'eksctl-todo-cluster')].StackName"
```

- Set Environment Variables

```bash
# Set your AWS region and cluster name
export AWS_REGION=us-east-1
export CLUSTER_NAME=todo-cluster
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "Cluster Name: $CLUSTER_NAME"
```

- Create ECR Repositories

```bash
# Create repository for backend
aws ecr create-repository \
  --repository-name todo-backend \
  --profile project-01-eks-deployer

# Create repository for frontend
aws ecr create-repository \
  --repository-name todo-frontend \
  --profile project-01-eks-deployer

# List repositories
aws ecr describe-repositories --profile project-01-eks-deployer
```

- Authenticate Docker to ECR

```bash
# Get ECR login password and authenticate
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Verify authentication
echo "Authenticated to ECR: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

- Tag Images for ECR

```bash
# Tag backend image
docker tag todo-backend:v1 $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-backend:v1
docker tag todo-backend:v1 $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-backend:latest

# Tag frontend image
docker tag todo-frontend:v1 $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-frontend:v1
docker tag todo-frontend:v1 $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-frontend:latest

# Verify tags
docker images | grep ecr
```

- Build images for AMD64

```bash

cd backend

docker buildx build --platform linux/amd64 -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-backend:v1 -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-backend:latest --push .

cd ..
cd frontend

docker buildx build --platform linux/amd64 -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-frontend:v1 -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-frontend:latest

```

- Push Images to ECR

```bash
# Push backend
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-backend:v1
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-backend:latest

# Push frontend
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-frontend:v1
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-frontend:latest

# Verify images in ECR
aws ecr list-images --repository-name todo-backend --region $AWS_REGION
aws ecr list-images --repository-name todo-frontend --region $AWS_REGION

# Get image URIs
aws ecr describe-images --repository-name todo-backend --region $AWS_REGION
aws ecr describe-images --repository-name todo-frontend --region $AWS_REGION
```

- Prepare k8s-eks manifest files
- Apply Manifests in Order

```bash
cd k8s-eks

# 1. Apply Secrets and ConfigMaps
kubectl apply -f mongodb-secret.yaml
kubectl apply -f backend-configmap.yaml

# Verify
kubectl get secrets,configmaps

# 2. Deploy MongoDB
kubectl apply -f mongodb.yaml

# Wait for MongoDB to be ready
kubectl wait --for=condition=ready pod -l app=mongodb --timeout=300s

# Check MongoDB status
kubectl get pods -l app=mongodb
kubectl logs -l app=mongodb --tail=20

# 3. Deploy Backend
kubectl apply -f backend.yaml

# Wait for backend pods
kubectl wait --for=condition=ready pod -l app=backend --timeout=300s

# Check backend status
kubectl get pods -l app=backend
kubectl logs -l app=backend --tail=20

# 4. Deploy Frontend
kubectl apply -f frontend.yaml

# Wait for frontend pods
kubectl wait --for=condition=ready pod -l app=frontend --timeout=300s

# Check frontend status
kubectl get pods -l app=frontend
```

- Troubleshooting

```bash
kubectl logs -l app=backend --tail=50
```

- Monitor Deployment

```bash
# Watch all pods
kubectl get pods -w
# Press Ctrl+C when all pods are Running

# Check all resources
kubectl get all

# Check pod status with more details
kubectl get pods -o wide

# Check services
kubectl get services
```

- Wait for LoadBalancer Provisioning

```bash
# Watch for EXTERNAL-IP assignment (takes 2-5 minutes)
kubectl get service frontend -w
# Press Ctrl+C when EXTERNAL-IP is no longer <pending>

# Get the LoadBalancer DNS name
LOAD_BALANCER=$(kubectl get service frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Application URL: http://$LOAD_BALANCER"

# Note: AWS EKS LoadBalancers use DNS names, not IP addresses
```

- Access Application

```bash
# Get frontend URL
FRONTEND_URL=$(kubectl get service frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Application URL: http://$FRONTEND_URL"

# Wait for DNS propagation (30-60 seconds)
sleep 60

# Test with curl
curl http://$FRONTEND_URL

# Open in browser
open "http://$FRONTEND_URL"  # macOS
xdg-open "http://$FRONTEND_URL"  # Linux
```

- Test Backend API

```bash
# Port-forward to backend service
kubectl port-forward service/backend 3000:3000 &

# Test health endpoint
curl http://localhost:3000/health

# Test todos endpoint
curl http://localhost:3000/todos

# Create a todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"text":"Test from EKS"}'

# Get all todos
curl http://localhost:3000/todos

# Stop port-forward
pkill -f "port-forward service/backend"
```

- Test Application Features

1. Open application in browser using LoadBalancer URL
2. Add multiple TODO items
3. Mark items as complete
4. Delete TODO items
5. Refresh page to verify data persistence in MongoDB
6. Open in multiple browser tabs to test load balancing

- Check Application Logs

```bash
# View backend logs
kubectl logs -l app=backend --tail=50

# View frontend logs
kubectl logs -l app=frontend --tail=50

# View MongoDB logs
kubectl logs -l app=mongodb --tail=50

# Follow logs in real-time
kubectl logs -f -l app=backend

# View logs from specific pod
kubectl logs <pod-name>

# View previous pod logs (if pod crashed)
kubectl logs <pod-name> --previous
```

- Verify Load Balancer in AWS

```bash
# Get load balancer details
aws elbv2 describe-load-balancers --region $AWS_REGION

# Get target groups
aws elbv2 describe-target-groups --region $AWS_REGION

# Check target health
LB_ARN=$(aws elbv2 describe-load-balancers --region $AWS_REGION --query "LoadBalancers[?contains(LoadBalancerName, 'k8s-default-frontend')].LoadBalancerArn" --output text)
TG_ARN=$(aws elbv2 describe-target-groups --load-balancer-arn $LB_ARN --query "TargetGroups[0].TargetGroupArn" --output text)
aws elbv2 describe-target-health --target-group-arn $TG_ARN
```

- Check Resource Usage

```bash
# Install metrics server (if not already installed)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Wait for metrics server to be ready
kubectl wait --for=condition=ready pod -n kube-system -l k8s-app=metrics-server --timeout=120s

# View pod resource usage
kubectl top pods

# View node resource usage
kubectl top nodes

# Describe nodes
kubectl describe nodes
```

- Check Deployments

```bash
# List all deployments
kubectl get deployments

# Get deployment details
kubectl describe deployment backend
kubectl describe deployment frontend
kubectl describe deployment mongodb

# Check replica sets
kubectl get rs

# Check pod distribution across nodes
kubectl get pods -o wide
```

- Verify Scaling Works

```bash
# Scale backend to 3 replicas
kubectl scale deployment backend --replicas=3

# Watch scaling
kubectl get pods -l app=backend -w
# Press Ctrl+C after new pod is Running

# Check deployment status
kubectl rollout status deployment/backend

# Scale back to 2
kubectl scale deployment backend --replicas=2

# Verify
kubectl get deployment backend
```

- Test Rolling Updates
  
```bash
# Update backend image (simulate new version)
kubectl set image deployment/backend backend=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/todo-backend:latest

# Watch rollout
kubectl rollout status deployment/backend

# Check rollout history
kubectl rollout history deployment/backend

# Rollback if needed
# kubectl rollout undo deployment/backend
```

- Check EKS Dashboard (AWS Console)

```bash
# Get EKS console URL
echo "https://console.aws.amazon.com/eks/home?region=$AWS_REGION#/clusters/todo-cluster"

# Or view cluster details via CLI
aws eks describe-cluster --name todo-cluster --region $AWS_REGION

# View node group details
aws eks describe-nodegroup \
  --cluster-name todo-cluster \
  --nodegroup-name todo-nodes \
  --region $AWS_REGION
```
