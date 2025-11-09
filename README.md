# My First Kubernetes Deployment on AWS EKS: Key Learnings

*Lessons from deploying a multi-container TODO app to production*

---
## The Project

I built and deployed a three-tier TODO application (Node.js backend, static frontend, MongoDB) on Amazon EKS to learn Kubernetes fundamentals. Here are the key insights that actually matter.

---

## 1. The ARM vs AMD64 Trap

**The Problem**: My pods crashed with `exec format error`.

**Why**: I built Docker images on my M1 MacBook (ARM64) but EKS nodes run on AMD64 architecture.

**The Fix**: Always build for your target platform:
```bash
docker buildx build --platform linux/amd64 -t myimage:v1 --push .
```

**Lesson**: Your laptop architecture ≠ production architecture. Build accordingly.

---

## 2. MongoDB Authentication Gotcha

**The Problem**: Backend couldn't connect to MongoDB despite correct credentials.

**Why**: MongoDB needs to know which database to authenticate against.

**The Fix**: Add `?authSource=admin` to the connection string:
```
mongodb://mongodb:27017/todos?authSource=admin
```

**Lesson**: Read the error logs carefully. The answer is usually there.

---

## 3. Deployment Order Matters

**The Problem**: Pods kept restarting unnecessarily.

**Why**: I deployed everything at once. Backend tried connecting to MongoDB before it was ready.

**The Fix**: Deploy in dependency order:
1. Secrets & ConfigMaps
2. Database (wait for ready)
3. Backend (wait for ready)
4. Frontend

**Lesson**: Understand your application's dependency graph.

---

## 4. IAM: Don't Use Root

**The Problem**: Used my root AWS account initially (huge security risk).

**The Fix**: Created an IAM user with least privilege permissions:
- EKS management
- ECR access
- EC2/VPC creation
- Load balancer management
- Limited IAM role creation

**Lesson**: Security from day one. Create dedicated IAM users for each project and delete them when done.

---

## 5. Health Checks Are Critical

**The Problem**: Kubernetes couldn't tell if my pods were actually working.

**The Fix**: Implemented proper probes:
- **Liveness probe**: Restart if check fails (detects crashes)
- **Readiness probe**: Remove from load balancer if not ready (detects startup/overload)

**Lesson**: Without health checks, Kubernetes is flying blind. Add a `/health` endpoint to every service.

---

## 6. Test Locally First

**The Mistake**: Deployed directly to EKS without local testing.

**The Fix**: Use Minikube for local development:
- Free
- Faster iteration
- Same Kubernetes manifests
- Catch errors before cloud deployment

**Lesson**: Local → Cloud, not the other way around. Minikube saves time and money.

---

## 7. kubectl Context Confusion

**The Problem**: Ran commands against Minikube when I meant EKS (and vice versa).

**The Fix**: Always check current context:
```bash
kubectl config current-context
kubectl config use-context <eks-context-name>
```

**Lesson**: Know which cluster you're targeting. One wrong command can cause havoc.

---

## Is Kubernetes Worth It?

**For learning**: Absolutely. Forces you to think about distributed systems.
**For small projects**: Probably not. Docker Compose + single server is simpler.
**For production at scale**: Yes, but consider managed options (EKS, GKE, AKS) to reduce operational burden.

---
## Final Thought

Kubernetes has a steep learning curve, but building a real project forces you to understand the "why" behind the complexity. Start simple, break things, learn from errors, and gradually add sophistication.

The goal isn't to master Kubernetes in one project—it's to build a mental model of how container orchestration works.

---

**Questions?** Drop them in the comments. Happy to help others on their K8s journey.

**Found this helpful?** Share it with someone learning Kubernetes!

---

*Part of my cloud-native learning journey. Follow for more hands-on tutorials.*
