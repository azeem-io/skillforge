#!/usr/bin/env bash
# Prints a production .env for one domain, with fresh secrets, ready to paste
# into Coolify's Environment Variables. Nothing is written to disk here — the
# secrets should exist in exactly one place, and that place is the deployment.
#
#   ./scripts/prod-env.sh app.1.2.3.4.sslip.io
#   ./scripts/prod-env.sh app.1.2.3.4.sslip.io | pbcopy
#
# The DeepSeek key is copied from a local .env when one exists, otherwise left
# for you to fill in.

set -euo pipefail

cd "$(dirname "$0")/.."

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "usage: $0 <domain>      e.g. app.1.2.3.4.sslip.io" >&2
  exit 1
fi
case "$DOMAIN" in
  http://*|https://*) echo "pass the bare hostname, without a scheme" >&2; exit 1 ;;
esac

command -v openssl >/dev/null 2>&1 || { echo "openssl is required" >&2; exit 1; }

deepseek=""
if [ -f .env ]; then
  deepseek=$(grep -E '^DEEPSEEK_API_KEY=' .env | cut -d= -f2- || true)
fi

cat <<ENV
# SkillForge — production, generated $(date -u +%Y-%m-%dT%H:%MZ) for https://${DOMAIN}

POSTGRES_USER=skillforge
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=skillforge

BETTER_AUTH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
GATEWAY_SECRET=$(openssl rand -hex 32)

# Real TLS is terminated in front of the stack, so cookies are Secure and the
# only trusted origin is the public one.
SITE_ADDRESS=${DOMAIN}
TRUSTED_ORIGINS=https://${DOMAIN}
AUTH_INSECURE_COOKIES=false

DEEPSEEK_API_KEY=${deepseek:-sk-REPLACE_ME}
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

# Seed the taxonomy on every boot while it is still changing.
SEED_ON_START=true
ENV

if [ -z "$deepseek" ]; then
  echo "! no local .env with DEEPSEEK_API_KEY — replace sk-REPLACE_ME before deploying" >&2
fi
