terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}

locals {
  ssh_key = var.ssh_public_key_path == "" ? "" : "${var.ssh_user}:${file(var.ssh_public_key_path)}"
}

resource "google_compute_firewall" "sre_ssh" {
  name    = "${var.project_name}-allow-ssh"
  network = var.network

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = [var.ssh_cidr]
  target_tags   = [var.project_name]
}

resource "google_compute_firewall" "sre_app" {
  name    = "${var.project_name}-allow-app"
  network = var.network

  allow {
    protocol = "tcp"
    ports    = ["80", "8080"]
  }

  source_ranges = [var.app_cidr]
  target_tags   = [var.project_name]
}

resource "google_compute_firewall" "sre_monitoring" {
  name    = "${var.project_name}-allow-monitoring"
  network = var.network

  allow {
    protocol = "tcp"
    ports    = ["3000", "9090"]
  }

  source_ranges = [var.monitoring_cidr]
  target_tags   = [var.project_name]
}

resource "google_compute_instance" "sre" {
  name         = "${var.project_name}-vm"
  machine_type = var.machine_type
  zone         = var.gcp_zone
  tags         = [var.project_name]

  boot_disk {
    initialize_params {
      image = var.image
      size  = var.root_volume_size_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    network = var.network

    access_config {
      // Ephemeral public IP for assignment demo.
    }
  }

  metadata = merge(
    var.ssh_public_key_path == "" ? {} : { ssh-keys = local.ssh_key },
    {
      startup-script = file("${path.module}/cloud-init.sh")
    }
  )

  labels = var.labels
}
