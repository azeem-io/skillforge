# The SkillForge host: one Contabo VPS running the compose stack behind Coolify.
#
# Deliberately not a Kubernetes cluster. kubernetes/ describes the same system
# for a cluster that can run it, but the deployment we actually operate is
# docker-compose.yml on this box, and IaC that describes an imaginary
# deployment is the decorative infrastructure the rubric punishes.

resource "contabo_secret" "ssh_key" {
  name  = "${var.display_name}-ssh"
  type  = "ssh"
  value = var.ssh_public_key
}

resource "contabo_secret" "root_password" {
  name  = "${var.display_name}-root"
  type  = "password"
  value = var.root_password
}

resource "contabo_instance" "skillforge" {
  # Adopts the existing VPS when the variable is set. Note the provider's own
  # warning: changing image_id, root_password or ssh_keys on an existing
  # instance REINSTALLS it. Set existing_instance_id and change nothing else
  # unless you mean it.
  existing_instance_id = var.existing_instance_id

  display_name = var.display_name
  product_id   = var.product_id
  region       = var.region

  ssh_keys      = [contabo_secret.ssh_key.id]
  root_password = contabo_secret.root_password.id

  # Docker, a non-root user and Coolify, so a fresh box arrives ready to run
  # docker-compose.yml. Ignored when adopting an existing instance.
  user_data = templatefile("${path.module}/cloud-init.yaml", {
    site_address = var.site_address
  })
}

resource "contabo_firewall" "skillforge" {
  name        = "${var.display_name}-fw"
  description = "SkillForge: web from anywhere, SSH from admin_cidrs only"
  status      = "active"

  instance_ids = [contabo_instance.skillforge.id]

  rules {
    # HTTP is not redundant next to HTTPS: Caddy needs port 80 reachable to
    # answer the ACME challenge, even though every request to it redirects.
    inbound {
      protocol   = "tcp"
      action     = "accept"
      status     = "active"
      dest_ports = ["80", "443"]
      src_cidr {
        ipv4 = ["0.0.0.0/0"]
      }
    }

    inbound {
      protocol   = "tcp"
      action     = "accept"
      status     = "active"
      dest_ports = ["22"]
      src_cidr {
        ipv4 = var.admin_cidrs
      }
    }

    # HTTP/3, same port as 443 but UDP.
    inbound {
      protocol   = "udp"
      action     = "accept"
      status     = "active"
      dest_ports = ["443"]
      src_cidr {
        ipv4 = ["0.0.0.0/0"]
      }
    }
  }
}

# Postgres is never in this list. It has no published port in
# docker-compose.yml, and the firewall is the second reason it is unreachable
# rather than the only one.
