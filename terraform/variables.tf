variable "oauth2_client_id" {
  description = "Contabo API client id."
  type        = string
  sensitive   = true
  default     = null
}

variable "oauth2_client_secret" {
  description = "Contabo API client secret."
  type        = string
  sensitive   = true
  default     = null
}

variable "oauth2_user" {
  description = "Contabo API user — the Customer Control Panel email address."
  type        = string
  sensitive   = true
  default     = null
}

variable "oauth2_pass" {
  description = "Contabo API password. Not the control panel login password."
  type        = string
  sensitive   = true
  default     = null
}

# The VPS already exists and runs Coolify. Setting this adopts it instead of
# ordering a second one, so `terraform apply` describes the box we actually
# have rather than buying another. Leave it null to provision from scratch.
variable "existing_instance_id" {
  description = "Instance id of an already-ordered VPS to manage, or null to order one."
  type        = string
  default     = null
}

variable "display_name" {
  description = "Name shown in the Contabo panel."
  type        = string
  default     = "skillforge"
}

variable "product_id" {
  description = "Contabo product. V45 is Cloud VPS 10 (3 vCPU / 8GB); see the product list for others."
  type        = string
  default     = "V45"
}

variable "region" {
  description = "EU, US-central, US-east, US-west or SIN."
  type        = string
  default     = "EU"

  validation {
    condition     = contains(["EU", "US-central", "US-east", "US-west", "SIN"], var.region)
    error_message = "Region must be one Contabo actually offers."
  }
}

variable "ssh_public_key" {
  description = "Public key installed for the default user. Required — password-only SSH on a public IP is a bad afternoon."
  type        = string
}

variable "root_password" {
  description = "Root password stored as a Contabo secret. Generate one; do not reuse."
  type        = string
  sensitive   = true
}

variable "site_address" {
  description = "Hostname Caddy issues a certificate for. Must already resolve to this server."
  type        = string
  default     = "skillforge.example.com"
}

variable "admin_cidrs" {
  description = "Who may reach SSH. Defaults to the whole internet, which you should narrow."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
