variable "gcp_project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "gcp_region" {
  description = "Google Cloud region."
  type        = string
  default     = "europe-west1"
}

variable "gcp_zone" {
  description = "Google Cloud zone."
  type        = string
  default     = "europe-west1-b"
}

variable "project_name" {
  description = "Prefix for created Google Cloud resources."
  type        = string
  default     = "sre-assignment"
}

variable "machine_type" {
  description = "Compute Engine machine type for the Docker host."
  type        = string
  default     = "e2-medium"
}

variable "image" {
  description = "Boot image for the VM."
  type        = string
  default     = "ubuntu-os-cloud/ubuntu-2204-lts"
}

variable "network" {
  description = "VPC network name."
  type        = string
  default     = "default"
}

variable "ssh_user" {
  description = "Linux username for metadata SSH key."
  type        = string
  default     = "ubuntu"
}

variable "ssh_public_key_path" {
  description = "Path to local SSH public key. Leave empty to use gcloud compute ssh instead."
  type        = string
  default     = ""
}

variable "ssh_cidr" {
  description = "CIDR allowed to connect by SSH. For real deployments, restrict to your own IP."
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_cidr" {
  description = "CIDR allowed to access frontend HTTP ports."
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_ports" {
  description = "Public frontend ports opened by the VM firewall. Keep only 80 for the cloud deployment unless you intentionally run the frontend on another public port."
  type        = list(string)
  default     = ["80"]
}

variable "enable_monitoring_public_access" {
  description = "Whether to create public firewall rules for Grafana and Prometheus. Prefer false and use SSH tunnels; if true, restrict monitoring_cidr to your own IP."
  type        = bool
  default     = false
}

variable "monitoring_cidr" {
  description = "CIDR allowed to access Grafana and Prometheus."
  type        = string
  default     = "0.0.0.0/0"
}

variable "root_volume_size_gb" {
  description = "Root disk size in GB."
  type        = number
  default     = 20
}

variable "labels" {
  description = "Labels for Google Cloud resources."
  type        = map(string)
  default = {
    project = "devops-sre-assignment"
  }
}
