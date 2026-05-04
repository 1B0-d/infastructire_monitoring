# Assignment 6: Automation and Capacity Planning

## 1. Automation Implemented

The system now includes SRE automation for deployment, health verification, restart recovery, alerting, and capacity testing.

### Automated deployment

The full stack is started with one command:

```powershell
.\scripts\start-stack.ps1
```

This script performs a pre-deployment validation and then runs:

```powershell
docker compose up -d --build
```

### Pre-deployment configuration validation

The validation script checks required configuration before deployment:

```powershell
.\scripts\validate-env.ps1
```

It validates:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CREDENTIALS_HOST_PATH`
- `CORS_ORIGINS`
- `MONGO_URL`

It also prevents the known incident simulation value:

```text
MONGO_URL=mongodb://wrong-mongodb:27017/shop
```

This reduces the chance of repeating the previous configuration incident.

### Health checks and self-healing

Each Node.js microservice exposes:

```text
/health
/metrics
```

The main `docker-compose.yml` defines healthchecks for every application service. Node.js services call `/health` on their own service port, and the frontend checks `/healthz`.

The shared Node.js service Docker image also includes the same healthcheck as a fallback when a service image is run outside Docker Compose.

The main `docker-compose.yml` uses:

```yaml
restart: unless-stopped
```

This allows Docker to restart failed containers automatically unless they were manually stopped.

## 2. Monitoring and Alerting

Prometheus now loads alert rules from:

```text
prometheus/alerts.yml
```

The rules are connected in:

```text
prometheus/prometheus.yml
```

Implemented alerts:

- `ServiceDown`: Prometheus cannot scrape a service.
- `ServiceUnhealthy`: a service `/health` endpoint reports degraded state.
- `HighErrorRate`: more than 5% recent HTTP requests are errors.
- `HighLatency`: p95 request latency is above 1 second.
- `HighProcessCpu`: a service uses more than 0.8 CPU cores.
- `HighProcessMemory`: a service uses more than 300 MB of resident memory.
- `ServiceRestartedRecently`: process start time changed in the last 10 minutes.

Prometheus alert page:

```text
http://localhost:9090/alerts
```

Grafana dashboard:

```text
http://localhost:3000
```

## 3. Capacity Planning Procedure

Start the stack:

```powershell
.\scripts\start-stack.ps1
```

Run a baseline check:

```powershell
node .\scripts\load-test.mjs --url http://localhost:4002/health --requests 100 --concurrency 5
```

Run a heavier load test against `order-service`:

```powershell
node .\scripts\load-test.mjs --url http://localhost:4002/health --requests 1000 --concurrency 50
```

Collect a Prometheus snapshot after the load test:

```powershell
.\scripts\prometheus-snapshot.ps1
```

Metrics collected:

- request rate by service
- error rate by service
- p95 latency by service
- process CPU usage
- process memory usage
- recent restarts
- target health

## 4. Capacity Analysis

The `order-service` is the main capacity risk because it performs order creation and reads order history from MongoDB. Under higher load, this service is expected to show the largest increase in:

- request latency
- CPU usage
- database dependency sensitivity
- error rate if MongoDB becomes slow or unavailable

The database can become the next bottleneck because `product-service`, `order-service`, and `chat-service` depend on the same MongoDB container.

## 5. Scaling Strategy

### Horizontal scaling

Run multiple instances of the most loaded service, especially `order-service`, and place a load balancer in front of them.

Example future direction:

```text
order-service-1
order-service-2
order-service-3
```

Requests would be distributed by Nginx, Docker Swarm, or Kubernetes.

### Vertical scaling

Increase VM capacity using Terraform by changing:

```hcl
machine_type = "e2-medium"
```

to a larger machine type such as:

```hcl
machine_type = "e2-standard-2"
```

This gives more CPU and memory to Docker containers.

### Database optimization

Recommended improvements:

- add indexes for common order queries
- tune MongoDB resources
- use connection pooling
- move the database to a dedicated managed service
- separate read-heavy and write-heavy workloads if demand grows

## 6. Evidence Checklist

Attach screenshots for the final PDF:

- Docker Compose containers in healthy/running state.
- Prometheus targets page with services `UP`.
- Prometheus alerts page showing configured rules.
- Grafana dashboard during normal operation.
- Load test command output.
- Grafana or Prometheus metrics during load.
- Recovery evidence after stopping or breaking one service and restoring it.
