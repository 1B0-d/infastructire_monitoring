# Terraform Guide

Terraform is used for the infrastructure layer. It creates a Google Cloud Compute Engine VM, opens the required firewall ports, and installs Docker/Docker Compose on the VM.

Docker Compose is still responsible for running the application containers.

## Files

- `terraform/main.tf`: Google provider, VM, firewall rules.
- `terraform/variables.tf`: configurable inputs.
- `terraform/outputs.tf`: public IP and useful URLs.
- `terraform/terraform.tfvars.example`: example variable values.
- `terraform/cloud-init.sh`: installs Docker on the VM.

## Google Cloud Prerequisites

1. Create or choose a Google Cloud project.
2. Enable billing for the project.
3. Enable the Compute Engine API.
4. Install Google Cloud CLI.
5. Login:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <your-gcp-project-id>
```

Terraform uses Application Default Credentials from `gcloud auth application-default login`.

## Ports

Terraform opens:

- `22`: SSH
- `80`: HTTP frontend if deployed on port 80
- `8080`: current Docker Compose frontend mapping
- `3000`: Grafana
- `9090`: Prometheus

## Usage

From the project root:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

On Windows `cmd`, use:

```cmd
copy terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:

```hcl
gcp_project_id = "your-gcp-project-id"
```

Recommended: restrict `ssh_cidr` and `monitoring_cidr` to your public IP.

Then run:

```bash
terraform init
terraform plan
terraform apply
```

Terraform will output:

- VM public IP
- `gcloud compute ssh` command
- Frontend URL
- Grafana URL
- Prometheus URL

## Deploy App To VM

SSH into the VM:

```bash
gcloud compute ssh sre-assignment-vm --zone europe-west1-b --project <your-gcp-project-id>
```

Then:

```bash
git clone <your-repository-url>
cd <your-project>
cp .env.example .env
```

Add the Firebase service account JSON at:

```text
lol/serviceAccountKey.json
```

Start the application:

```bash
docker compose up -d --build
```

## Screenshots For Assignment 5

- `terraform init`
- `terraform plan`
- `terraform apply`
- Terraform outputs with public IP
- Google Cloud VM running
- Google Cloud firewall rules
- App running on the VM
- Prometheus on `http://<public_ip>:9090`
- Grafana on `http://<public_ip>:3000`

## Cleanup

To avoid cloud charges:

```bash
terraform destroy
```
