output "instance_name" {
  description = "Created Compute Engine instance name."
  value       = google_compute_instance.sre.name
}

output "zone" {
  description = "Compute Engine zone."
  value       = google_compute_instance.sre.zone
}

output "public_ip" {
  description = "Public IP address of the VM."
  value       = google_compute_instance.sre.network_interface[0].access_config[0].nat_ip
}

output "gcloud_ssh_command" {
  description = "gcloud SSH command for connecting to the VM."
  value       = "gcloud compute ssh ${google_compute_instance.sre.name} --zone ${var.gcp_zone} --project ${var.gcp_project_id}"
}

output "ssh_command" {
  description = "Plain SSH command if an SSH public key was configured."
  value       = "ssh ${var.ssh_user}@${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}"
}

output "frontend_url" {
  description = "Frontend URL if Docker Compose is mapped to port 80 on the VM."
  value       = "http://${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}"
}

output "frontend_compose_url" {
  description = "Frontend URL with the current local Docker Compose port mapping."
  value       = "http://${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}:8080"
}

output "grafana_url" {
  description = "Grafana URL."
  value       = "http://${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}:3000"
}

output "prometheus_url" {
  description = "Prometheus URL."
  value       = "http://${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}:9090"
}
