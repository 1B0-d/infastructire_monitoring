# DevOps/SRE Microservices Assignment

This project now runs the five backend microservices required by the assignment, plus a frontend and MongoDB. The original portfolio frontend is reused, and the shop/order domain is reused as product and order functionality.

Current implemented stage: five microservices, Firebase authentication, MongoDB data, service-to-service communication, Docker Compose, Prometheus metrics, and Grafana dashboard.

## Architecture

```text
browser
  -> frontend nginx :8080 local / :80 VM
      -> auth-service    :4000
      -> product-service :4001
      -> order-service   :4002
      -> user-service    :4003
      -> chat-service    :4004

user-service
  -> order-service through Docker DNS:
     http://order-service:4002/api/orders/my

product-service/order-service/chat-service
  -> mongodb:
     mongodb://mongodb:27017/shop

prometheus
  -> scrapes all five services /metrics

grafana
  -> visualizes Prometheus metrics
```

## Microservices

1. `auth-service`
   - Verifies Firebase ID tokens.
   - Exposes `/api/me`, `/api/bootstrap-user`, `/api/auth/verify`.

2. `product-service`
   - Stores and returns products/categories from MongoDB.
   - Exposes `/api/products`, `/api/products/:id`, `/api/categories`.

3. `order-service`
   - Creates and lists orders.
   - Saves Firebase `uid` as `userId`.
   - Exposes `/api/orders`, `/api/orders/my`.

4. `user-service`
   - Returns profile/project data.
   - Calls order-service internally for `/api/my-orders`.

5. `chat-service`
   - Stores user messages and admin replies.
   - Exposes `/api/messages`, `/api/admin/messages`, `/api/admin/reply`.

## Run

1. Make sure Docker Desktop is running.
2. Make sure Firebase service account JSON exists at `./lol/serviceAccountKey.json`, or set `FIREBASE_CREDENTIALS_HOST_PATH`.
3. Start:

```bash
docker compose up -d --build
```

On Windows PowerShell, the Assignment 6 preflight and startup automation can be run with:

```powershell
.\scripts\start-stack.ps1
```

Open:

- Frontend: http://localhost:8080
- Auth health: http://localhost:4000/health
- Product health: http://localhost:4001/health
- Order health: http://localhost:4002/health
- User health: http://localhost:4003/health
- Chat health: http://localhost:4004/health
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

Grafana login:

```text
admin / admin
```

## Port Exposure

Docker Compose uses port variables so local development and the Google Cloud VM can use different exposure rules.

Local default:

```env
FRONTEND_PORT=8080
BACKEND_BIND_ADDRESS=127.0.0.1
MONITORING_BIND_ADDRESS=127.0.0.1
```

This means the frontend is available on `localhost:8080`, while backend ports `4000-4004`, MongoDB `27017`, Grafana `3000`, and Prometheus `9090` are bound to localhost only.

VM recommended values:

```env
FRONTEND_PORT=80
CORS_ORIGINS=http://<VM_PUBLIC_IP>
BACKEND_BIND_ADDRESS=127.0.0.1
MONITORING_BIND_ADDRESS=127.0.0.1
```

On the VM, the public frontend should be `http://<VM_PUBLIC_IP>`. Backend and database ports stay closed externally. Use SSH tunnels for Grafana and Prometheus, or explicitly enable restricted monitoring firewall access in Terraform.

## Authentication

The frontend signs users in with Firebase Authentication and receives a Firebase ID token. The token is sent as:

```text
Authorization: Bearer <Firebase ID token>
```

Every backend service verifies the Firebase token with Firebase Admin SDK. Missing or invalid tokens return `401 Unauthorized`.

## Monitoring

Each microservice exposes:

```text
/metrics
```

Prometheus scrapes:

- `auth-service:4000/metrics`
- `product-service:4001/metrics`
- `order-service:4002/metrics`
- `user-service:4003/metrics`
- `chat-service:4004/metrics`
- `prometheus:9090`

Tracked metrics include:

- `sre_http_requests_total`
- `sre_http_request_duration_seconds`
- `sre_http_errors_total`
- `sre_service_health`
- `sre_service_uptime_seconds`

Grafana automatically provisions a dashboard named `SRE Microservices Overview`.

Prometheus alert rules are loaded from `prometheus/alerts.yml`. Open `http://localhost:9090/alerts` to view service-down, unhealthy-service, error-rate, latency, CPU, memory, and restart alerts.

## Capacity Planning

Run a simple load test against `order-service`:

```bash
node scripts/load-test.mjs --url http://localhost:4002/health --requests 1000 --concurrency 50
```

Collect a Prometheus metric snapshot after the test:

```powershell
.\scripts\prometheus-snapshot.ps1
```

See `docs/assignment-6-automation-capacity.md` for the Assignment 6 automation and capacity-planning write-up.

## Service Communication

The frontend calls `GET /api/my-orders` through nginx. That request goes to `user-service`.

`user-service` verifies the Firebase token and calls `order-service` internally:

```text
http://order-service:4002/api/orders/my
```

It forwards the same `Authorization` header. If order-service is unavailable, user-service returns:

```json
{ "error": "Order service unavailable" }
```

with status `503`.

## Incident Simulation

Working value:

```env
MONGO_URL=mongodb://mongodb:27017/shop
```

Broken value:

```env
MONGO_URL=mongodb://wrong-mongodb:27017/shop
```

After changing the value, restart affected services:

```bash
docker compose up -d --build product-service order-service chat-service
```

Fix by restoring the working `MONGO_URL` and restarting them again.

## Screenshots For Report

- Running Docker containers.
- Frontend logged in through Firebase.
- Product list loaded from product-service.
- Successful order creation through order-service.
- My Orders loaded through user-service calling order-service.
- Chat message created through chat-service.
- Health endpoints for all five services.
- Prometheus targets page.
- Grafana `SRE Microservices Overview` dashboard.
- Before/after incident in Prometheus/Grafana.
- Terraform `init`, `plan`, `apply`, outputs, VM, and security group screenshots.

## Terraform

Terraform files are in `terraform/`.

They provision the infrastructure layer:

- Google Cloud Compute Engine VM
- Google Cloud firewall rules
- SSH and HTTP frontend ports
- optional restricted Grafana and Prometheus ports
- Docker and Docker Compose installation through cloud-init
- Public IP outputs

Quick workflow:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

See `docs/terraform-guide.md` for the full deployment flow.
"# sre-task" 
