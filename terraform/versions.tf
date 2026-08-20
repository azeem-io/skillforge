terraform {
  required_version = ">= 1.6"

  required_providers {
    contabo = {
      source  = "contabo/contabo"
      version = "~> 0.1.44"
    }
  }
}

# Credentials come from the Customer Control Panel, under account secret.
# Set them in the environment rather than in a .tfvars file:
#   export CNTB_OAUTH2_CLIENT_ID=... CNTB_OAUTH2_CLIENT_SECRET=...
#   export CNTB_OAUTH2_USER=...      CNTB_OAUTH2_PASS=...
provider "contabo" {
  oauth2_client_id     = var.oauth2_client_id
  oauth2_client_secret = var.oauth2_client_secret
  oauth2_user          = var.oauth2_user
  oauth2_pass          = var.oauth2_pass
}
