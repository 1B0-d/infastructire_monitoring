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
  description = "Frontend URL for the VM deployment when Docker Compose uses FRONTEND_PORT=80."
  value       = "http://${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}"
}

output "frontend_compose_url" {
  description = "Legacy frontend URL only if app_ports includes 8080 and Docker Compose uses FRONTEND_PORT=8080."
  value       = contains(var.app_ports, "8080") ? "http://${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}:8080" : "Port 8080 is closed by Terraform firewall."
}

output "grafana_url" {
  description = "Grafana URL only when enable_monitoring_public_access is true and MONITORING_BIND_ADDRESS=0.0.0.0."
  value       = var.enable_monitoring_public_access ? "http://${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}:3000" : "Grafana public access is disabled. Use an SSH tunnel to localhost:3000."
}

output "prometheus_url" {
  description = "Prometheus URL only when enable_monitoring_public_access is true and MONITORING_BIND_ADDRESS=0.0.0.0."
  value       = var.enable_monitoring_public_access ? "http://${google_compute_instance.sre.network_interface[0].access_config[0].nat_ip}:9090" : "Prometheus public access is disabled. Use an SSH tunnel to localhost:9090."
}
