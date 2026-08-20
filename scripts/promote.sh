#!/usr/bin/env bash
# Grants a role to an existing account. Everyone registers as a student, so the
# first admin has to be made from outside the app — after that an admin can
# promote anyone from the roster.
#
#   ./scripts/promote.sh you@example.com admin
#   ./scripts/promote.sh mentor@example.com mentor

set -euo pipefail

cd "$(dirname "$0")/.."

EMAIL="${1:-}"
ROLE="${2:-admin}"

if [ -z "$EMAIL" ]; then
  echo "usage: $0 <email> [student|mentor|admin]" >&2
  exit 1
fi

case "$ROLE" in
  student|mentor|admin) ;;
  *) echo "role must be student, mentor or admin" >&2; exit 1 ;;
esac

[ -f .env ] || { echo ".env is missing — run ./scripts/setup.sh first" >&2; exit 1; }
# shellcheck disable=SC1091
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2)

updated=$(docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA \
  -c "update users set role = '$ROLE' where email = '$EMAIL' returning email;")

if [ -z "$updated" ]; then
  echo "no account with email $EMAIL — register in the app first" >&2
  exit 1
fi

echo "$EMAIL is now $ROLE"
