output "instance_id" {
  description = "Contabo instance id. Put it in existing_instance_id to adopt this box on a later run."
  value       = contabo_instance.skillforge.id
}

output "ipv4" {
  description = "Public IPv4. Point the site_address DNS record here before Caddy tries to issue a certificate."
  value       = try(contabo_instance.skillforge.ip_config[0].v4[0].ip, null)
}

output "status" {
  value = contabo_instance.skillforge.status
}

output "next_steps" {
  value = <<-EOT
    1. Point ${var.site_address} at the ipv4 output above.
    2. ssh deploy@<ip>, git clone the repo, cp .env.example .env and fill it in.
    3. docker compose up -d --build
    Coolify is already installed and listening on :8000 for the managed path.
  EOT
}
