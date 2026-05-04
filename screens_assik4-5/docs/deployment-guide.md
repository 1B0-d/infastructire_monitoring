# Deployment Guide

## Local Docker Compose

Requirements:

- Docker Desktop
- Firebase project with Authentication enabled
- Firebase service account JSON

Steps:

1. Put the Firebase service account at `lol/serviceAccountKey.json`.
2. Optionally create `.env` from `.env.example`.
3. Run:

```bash
docker compose up --build
```

4. Open `http://localhost:8080`.
5. Sign in through Firebase.
6. Check service health:

```bash
curl http://localhost:4000/health
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health
```

7. Check metrics:

```bash
curl http://localhost:4000/metrics
curl http://localhost:4001/metrics
curl http://localhost:4002/metrics
curl http://localhost:4003/metrics
curl http://localhost:4004/metrics
```

8. Open monitoring:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`
- Grafana login: `admin / admin`

In Prometheus, open `Status -> Targets` and confirm all jobs are `UP`.

In Grafana, open `Dashboards -> SRE -> SRE Microservices Overview`.

## Services

- `auth-service`: Firebase token/session verification.
- `product-service`: products and categories in MongoDB.
- `order-service`: transactional order creation.
- `user-service`: profile/projects and internal order lookup.
- `chat-service`: messages between users/admin.
- `frontend`: nginx gateway and React UI.
- `mongodb`: shared assignment database.
- `prometheus`: scrapes `/metrics` endpoints.
- `grafana`: visualizes Prometheus metrics.

## Environment

Important variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CREDENTIALS_HOST_PATH`
- `MONGO_URL`
- `CORS_ORIGINS`
- `ORDER_SERVICE_URL` inside `user-service`

`ORDER_SERVICE_URL` is set in Docker Compose to `http://order-service:4002`.

## Incident Setup

To simulate the database incident, change:

```env
MONGO_URL=mongodb://mongodb:27017/shop
```

to:

```env
MONGO_URL=mongodb://wrong-mongodb:27017/shop
```

Then restart the MongoDB-backed services:

```bash
docker compose up -d --build product-service order-service chat-service
```

## Terraform Infrastructure

Terraform is in `terraform/` and provisions a Google Cloud Compute Engine VM plus firewall rules for:

- SSH `22`
- HTTP `80`
- Frontend compose port `8080`
- Grafana `3000`
- Prometheus `9090`

Use:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Before `terraform plan`, set `gcp_project_id` in `terraform.tfvars` and authenticate:

```bash
gcloud auth application-default login
gcloud config set project <your-gcp-project-id>
```

After Terraform creates the VM, SSH into it with the output `gcloud compute ssh` command and run Docker Compose there.
