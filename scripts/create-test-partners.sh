#!/usr/bin/env bash
# Creates the partner onboarding test partners (Test Partner, Test Partner Plus, Retired Partner)
# and sets their status, therapy limit and automatic access code. Safe to re-run: existing
# partners are found by slug and only patched.
#
# Usage: scripts/create-test-partners.sh <apiUrl> <superAdminToken>
#   apiUrl: the backend's API root, e.g. http://localhost:35001/api (a trailing /v1 is accepted)
#   superAdminToken: a Firebase ID token for a super admin
# Requires curl and jq.

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <apiUrl> <superAdminToken>" >&2
  exit 1
fi

API_URL="${1%/}"
API_URL="${API_URL%/v1}"
TOKEN="$2"
PARTNER_URL="$API_URL/v1/partner"

request() {
  local method="$1" url="$2" body="${3:-}"
  local response status
  response=$(curl -sS -X "$method" "$url" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    ${body:+--data "$body"} \
    -w $'\n%{http_code}')
  status="${response##*$'\n'}"
  response="${response%$'\n'*}"
  if [ "$status" -ge 400 ]; then
    echo "$method $url failed with $status: $response" >&2
    exit 1
  fi
  printf '%s' "$response"
}

# name|slug|active|therapySessionsPerCode|automaticAccessCode
PARTNERS=(
  "Test Partner|test-partner|true|0|true"
  "Test Partner Plus|test-partner-plus|true|6|false"
  "Retired Partner|retired-partner|false|0|false"
)

for row in "${PARTNERS[@]}"; do
  IFS='|' read -r name slug active therapy automatic <<<"$row"

  id=$(request GET "$PARTNER_URL" | jq -r --arg slug "$slug" '.[] | select(.slug == $slug) | .id')
  if [ -z "$id" ]; then
    id=$(request POST "$PARTNER_URL" "$(jq -nc --arg name "$name" '{name: $name}')" | jq -r '.id')
    echo "Created $name ($id)"
  else
    echo "Found $name ($id)"
  fi

  body=$(jq -nc --argjson active "$active" --argjson therapy "$therapy" \
    --argjson automatic "$automatic" \
    '{active: $active, therapySessionsPerCode: $therapy, automaticAccessCode: $automatic}')
  request PATCH "$PARTNER_URL/$id" "$body" >/dev/null
  echo "  active: $active, therapySessionsPerCode: $therapy, automaticAccessCode: $automatic"
done
