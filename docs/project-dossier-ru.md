# Досье по проекту SRE Microservices Assignment

## 1. Краткое описание

Проект представляет собой Dockerized microservices system для SRE/DevOps assignment. Он объединяет frontend, пять backend microservices, MongoDB, Prometheus, Grafana и Terraform infrastructure configuration.

Главная идея проекта: показать, как микросервисная система запускается, мониторится, переживает incident, восстанавливается и анализируется с точки зрения Site Reliability Engineering.

Проект закрывает три связанных части:

- Assignment 4: incident response and postmortem analysis.
- Assignment 5: infrastructure as code using Terraform.
- Assignment 6: SRE automation and capacity planning.

## 2. Архитектура

```text
Browser
  -> frontend nginx :8080
      -> auth-service    :4000
      -> product-service :4001
      -> order-service   :4002
      -> user-service    :4003
      -> chat-service    :4004

user-service
  -> order-service through Docker DNS:
     http://order-service:4002/api/orders/my

product-service / order-service / chat-service
  -> MongoDB:
     mongodb://mongodb:27017/shop

Prometheus
  -> scrapes every service /metrics

Grafana
  -> visualizes Prometheus metrics

Terraform
  -> provisions VM and firewall rules for deployment
```

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Nginx, static frontend from `lol/frontend` |
| Backend | Node.js, Express |
| Authentication | Firebase Authentication, Firebase Admin SDK |
| Database | MongoDB |
| Containerization | Docker, Docker Compose |
| Monitoring | Prometheus |
| Visualization | Grafana |
| IaC | Terraform for Google Cloud VM and firewall rules |
| Automation scripts | PowerShell, Node.js |

## 4. Services

### auth-service

Port: `4000`

Purpose:

- verifies Firebase ID tokens;
- exposes authenticated user data;
- provides auth verification endpoints.

Important endpoints:

```text
GET  /health
GET  /metrics
GET  /api/me
POST /api/bootstrap-user
GET  /api/auth/verify
```

### product-service

Port: `4001`

Purpose:

- stores and returns product/category data;
- depends on MongoDB;
- demonstrates database-backed service health.

Important endpoints:

```text
GET /health
GET /metrics
GET /api/products
GET /api/products/:id
GET /api/categories
```

### order-service

Port: `4002`

Purpose:

- creates user orders;
- returns current user's order history;
- is the main capacity-analysis candidate;
- depends on MongoDB.

Important endpoints:

```text
GET  /health
GET  /metrics
POST /api/orders
GET  /api/orders/my
```

Why it matters:

- it owns the business-critical order workflow;
- it is database-backed;
- if it fails, user order functionality is degraded.

### user-service

Port: `4003`

Purpose:

- returns profile/project data;
- calls `order-service` internally for user orders;
- demonstrates service-to-service communication.

Important endpoints:

```text
GET /health
GET /metrics
GET /api/users/me
GET /api/profile
GET /api/projects
GET /api/my-orders
```

### chat-service

Port: `4004`

Purpose:

- stores user messages and admin replies;
- depends on MongoDB.

Important endpoints:

```text
GET  /health
GET  /metrics
POST /api/messages
GET  /api/messages
GET  /api/admin/messages
POST /api/admin/reply
```

## 5. Docker Compose

Main file:

```text
docker-compose.yml
```

It starts:

- `frontend`
- `auth-service`
- `product-service`
- `order-service`
- `user-service`
- `chat-service`
- `mongodb`
- `prometheus`
- `grafana`

Important SRE features:

```yaml
restart: unless-stopped
```

This means Docker automatically restarts containers unless they were manually stopped.

Health checks are configured for application services:

```yaml
healthcheck:
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 20s
```

Database-backed services wait for MongoDB to become healthy:

```yaml
depends_on:
  mongodb:
    condition: service_healthy
```

The frontend waits for backend services to become healthy before starting.

## 6. Automation

Automation scripts are in:

```text
scripts/
```

### start-stack.ps1

Command:

```powershell
.\scripts\start-stack.ps1
```

What it does:

- runs pre-deployment validation;
- starts the stack with Docker Compose;
- shows container status.

### validate-env.ps1

Command:

```powershell
.\scripts\validate-env.ps1
```

Checks:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CREDENTIALS_HOST_PATH`
- `CORS_ORIGINS`
- `MONGO_URL`

It also rejects the incident simulation value:

```text
mongodb://wrong-mongodb:27017/shop
```

Why this matters:

- the previous incident was caused by invalid database configuration;
- validation reduces the risk of repeating the same issue.

### load-test.mjs

Command:

```powershell
node .\scripts\load-test.mjs --url http://localhost:4002/health --requests 1000 --concurrency 50
```

Measures:

- total requests;
- success count;
- failure count;
- duration;
- RPS;
- average latency;
- p95 latency;
- p99 latency.

Observed result:

```text
Requests: 1000
Concurrency: 50
Success: 1000
Failures: 0
RPS: 1814.85
Average latency: 23.95 ms
p95 latency: 60.39 ms
p99 latency: 298.03 ms
```

Important note:

This is a controlled local test against the `order-service` health endpoint. It demonstrates stable behavior under the tested workload, but it is not the absolute production maximum.

### prometheus-snapshot.ps1

Command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\prometheus-snapshot.ps1
```

Collects:

- targets up;
- RPS by service;
- error rate by service;
- p95 latency by service;
- CPU cores by job;
- memory MB by job;
- recent service restarts.

## 7. Monitoring

Prometheus config:

```text
prometheus/prometheus.yml
```

Prometheus scrapes:

```text
auth-service:4000/metrics
product-service:4001/metrics
order-service:4002/metrics
user-service:4003/metrics
chat-service:4004/metrics
prometheus:9090/metrics
```

Main metrics:

```text
sre_http_requests_total
sre_http_request_duration_seconds
sre_http_errors_total
sre_service_health
sre_service_uptime_seconds
```

Prometheus UI:

```text
http://localhost:9090
```

Targets page:

```text
http://localhost:9090/targets
```

Alerts page:

```text
http://localhost:9090/alerts
```

## 8. Alerting

Alert rules file:

```text
prometheus/alerts.yml
```

Configured alerts:

| Alert | Meaning |
|---|---|
| `ServiceDown` | Prometheus cannot scrape a service for at least 30 seconds |
| `ServiceUnhealthy` | service health metric reports unhealthy state |
| `HighErrorRate` | more than 5 percent of recent requests are errors |
| `HighLatency` | p95 latency is above 1 second |
| `HighProcessCpu` | process CPU usage is above 0.8 cores |
| `HighProcessMemory` | process memory usage is above 300 MB |
| `ServiceRestartedRecently` | process start time changed in the last 10 minutes |

Failure thresholds:

```text
Service down: 30 seconds
Error rate: > 5%
p95 latency: > 1 second
CPU: > 0.8 cores
Memory: > 300 MB
```

## 9. Grafana

Grafana URL:

```text
http://localhost:3000
```

Login:

```text
admin / admin
```

Dashboard:

```text
SRE Microservices Overview
```

Dashboard shows:

- Prometheus targets up;
- HTTP request rate;
- HTTP error rate;
- request duration p95;
- service health;
- service uptime.

## 10. Incident Scenario

The previous incident was simulated by breaking database connectivity.

Correct value:

```env
MONGO_URL=mongodb://mongodb:27017/shop
```

Broken value:

```env
MONGO_URL=mongodb://wrong-mongodb:27017/shop
```

Assignment 6 also demonstrates runtime failure by stopping `order-service`:

```powershell
docker compose stop order-service
```

Observed behavior:

- Prometheus target for `order-service` becomes `DOWN`;
- `ServiceDown` alert becomes `FIRING`;
- Grafana shows order-service target as down;
- other services stay available.

Recovery:

```powershell
docker compose up -d order-service
```

After recovery:

- `order-service` becomes `UP`;
- Docker reports it as healthy;
- Prometheus targets return to normal;
- Grafana shows service health again.

## 11. Capacity Analysis

Capacity was evaluated based on:

1. Maximum sustainable request rate under the tested workload.
2. Resource consumption per service.
3. Failure thresholds defined by alerts.

### Maximum sustainable request rate

The local tested workload was:

```text
1000 requests
50 concurrency
1814.85 RPS
0 failures
p95 latency 60.39 ms
```

Correct interpretation:

The system successfully handled the tested workload. This does not prove the absolute maximum capacity, but it shows that under this controlled local load the order-service remained stable.

### Resource consumption

Prometheus snapshot showed:

- CPU usage remained below alert thresholds;
- memory usage was around 79-93 MB per service;
- error rate was 0;
- p95 latency stayed far below the 1 second threshold.

### Bottleneck analysis

Most likely bottleneck:

```text
order-service
```

Reason:

- it owns order creation and order history;
- it depends on MongoDB;
- it is business-critical;
- if it fails, user order functionality is degraded.

Second likely bottleneck:

```text
MongoDB
```

Reason:

- product-service, order-service, and chat-service depend on it;
- database slowdown can affect several services.

## 12. Scaling Strategy

### Horizontal scaling

Run multiple instances of `order-service`:

```text
order-service-1
order-service-2
order-service-3
```

Use:

- Docker Swarm;
- Kubernetes;
- Nginx upstream load balancing;
- cloud load balancer.

### Vertical scaling

Increase VM resources using Terraform:

```hcl
machine_type = "e2-medium"
```

Possible stronger option:

```hcl
machine_type = "e2-standard-2"
```

### Database optimization

Recommended:

- add indexes for order queries;
- tune MongoDB CPU/memory;
- move database to managed service;
- use connection pooling;
- optimize queries;
- separate read-heavy and write-heavy workloads.

## 13. Terraform

Terraform directory:

```text
terraform/
```

Terraform provisions:

- Google Cloud Compute Engine VM;
- firewall rules;
- SSH access;
- frontend HTTP ports;
- Prometheus port `9090`;
- Grafana port `3000`;
- Docker installation through cloud-init.

Important files:

```text
terraform/main.tf
terraform/variables.tf
terraform/outputs.tf
terraform/cloud-init.sh
terraform/terraform.tfvars
```

Terraform is mostly used for Assignment 5, but Assignment 6 references it for vertical scaling strategy.

## 14. Evidence Screenshots

Screenshots are stored in:

```text
screens_assik6/
```

Main screenshots for the final report:

| File | Purpose |
|---|---|
| `03-health-order-service.png` | order-service health endpoint with database connected |
| `05-prometheus-targets-all-up.png` | Prometheus targets in normal state |
| `07-prometheus-alert-rules-service-error-latency.png` | alert rules for service/error/latency |
| `08-grafana-dashboard-normal-state.png` | Grafana normal dashboard |
| `10-prometheus-targets-order-service-down.png` | order-service down incident |
| `11-prometheus-alert-servicedown-firing.png` | ServiceDown alert firing |
| `13-prometheus-targets-recovery-all-up.png` | recovery after restart |
| `15-prometheus-snapshot-metrics.png` | Prometheus metric snapshot |
| `16-load-test-order-service.png` | load test output |
| `17-docker-compose-healthy-services.png` | Docker containers healthy |

## 15. Final PDF Report

Generated PDF:

```text
Assignment-6-Automation-Capacity-Report.pdf
```

Source HTML:

```text
docs/assignment-6-report.html
```

The PDF includes:

- criteria coverage;
- system context;
- automation implementation;
- health checks;
- monitoring and alerting;
- capacity planning;
- bottleneck analysis;
- incident and recovery demonstration;
- scaling strategy;
- limitations and next steps.

## 16. What to Say During Defense

Short explanation:

> This project is a Dockerized microservices system with five backend services, a frontend, MongoDB, Prometheus, Grafana, and Terraform infrastructure. For Assignment 6, I added SRE automation: Docker health checks, restart policies, environment validation, Prometheus alert rules, load testing, capacity analysis, and recovery evidence.

About capacity:

> I used 1000 requests with concurrency 50 as a controlled local load test. The goal was not to destroy the system, but to generate enough traffic for Prometheus and Grafana to capture RPS, latency, CPU, memory, and error rate. The tested workload completed with 0 failures and p95 latency around 60 ms.

About maximum capacity:

> The test shows the maximum stable workload that was tested locally, not the absolute production maximum. For a production-grade capacity test, I would run stepped load tests against authenticated order creation endpoints and increase concurrency until failures, high latency, or resource saturation appear.

About bottleneck:

> The main bottleneck candidate is order-service because it owns order workflows and depends on MongoDB. MongoDB is the second bottleneck candidate because multiple services depend on it.

About resilience:

> I stopped order-service, Prometheus detected it as DOWN, the ServiceDown alert fired, then I restarted the service and Prometheus returned to UP state. This demonstrates detection and recovery.

About Terraform:

> Terraform is used for infrastructure provisioning from the previous assignment. In Assignment 6, it is also part of the scaling strategy because VM size can be increased through the machine_type variable.

## 17. Limitations

Current limitations:

- full production auto-scaling is proposed, not implemented;
- load test was performed against `/health`, not real authenticated order creation;
- Alertmanager notification delivery is not configured;
- MongoDB is local containerized database, not managed cloud database;
- no cAdvisor container-level Docker metrics yet.

Why this is acceptable for the assignment:

- the assignment asks to implement automation and alerting;
- capacity planning can include analysis and proposed scaling strategies;
- auto-scaling considerations are explicitly allowed as proposed strategies;
- evidence demonstrates health checks, alerts, load test, incident, and recovery.

## 18. Important Commands

Start:

```powershell
.\scripts\start-stack.ps1
```

Check containers:

```powershell
docker compose ps
```

Health checks:

```text
http://localhost:4000/health
http://localhost:4001/health
http://localhost:4002/health
http://localhost:4003/health
http://localhost:4004/health
```

Prometheus:

```text
http://localhost:9090/targets
http://localhost:9090/alerts
```

Grafana:

```text
http://localhost:3000
```

Load test:

```powershell
node .\scripts\load-test.mjs --url http://localhost:4002/health --requests 1000 --concurrency 50
```

Prometheus snapshot:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\prometheus-snapshot.ps1
```

Incident:

```powershell
docker compose stop order-service
```

Recovery:

```powershell
docker compose up -d order-service
```

Stop all:

```powershell
docker compose down
```
