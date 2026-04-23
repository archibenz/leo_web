#!/usr/bin/env bash
# check-env.sh — verify all ${VAR} placeholders in application.yml have matching
# entries in the target env file. Prevents incidents like A22: removed fallback
# in application.yml, prod env had no DB_URL, API crashed on startup.
#
# Usage:
#   scripts/check-env.sh --template                 # check apps/api/.env.example (keys only, empty vals ok)
#   scripts/check-env.sh apps/api/.env              # check local .env (strict — values must be non-empty)
#   scripts/check-env.sh /etc/reinasleo/api.env     # check prod (on server, strict)
#
# Exit codes:
#   0 — ok (warnings allowed)
#   1 — required variable missing / empty
#   2 — bad arguments

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
YML="${REPO_ROOT}/apps/api/src/main/resources/application.yml"

MODE="strict"
ENV_FILE=""
for arg in "$@"; do
  case "$arg" in
    --template) MODE="template" ;;
    --strict)   MODE="strict" ;;
    -h|--help)
      sed -n '1,15p' "$0"
      exit 0
      ;;
    *) ENV_FILE="$arg" ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="${REPO_ROOT}/apps/api/.env.example"
  [[ "$MODE" == "strict" && "$(basename "$ENV_FILE")" == ".env.example" ]] && MODE="template"
fi

if [[ ! -f "$YML" ]]; then
  echo "error: application.yml not found at $YML" >&2
  exit 2
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: env file not found: $ENV_FILE" >&2
  exit 2
fi

# Extract unique ${VAR} and ${VAR:default} placeholders from application.yml.
# Produces two-column TSV: <NAME>\t<has_default: 0|1>
placeholders="$(
  grep -oE '\$\{[A-Z_][A-Z0-9_]*(:[^}]*)?\}' "$YML" \
    | sort -u \
    | sed -E 's/^\$\{([A-Z_][A-Z0-9_]*)(:.*)?\}$/\1\t\2/' \
    | awk -F'\t' 'BEGIN{OFS="\t"} {print $1, ($2 == "" ? 0 : 1)}'
)"

# Build set of defined non-empty keys from env file (strip comments, blank lines).
defined="$(
  grep -E '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE" \
    | sed -E 's/=.*$//' \
    | sort -u
)"

# Keys with empty values are treated as "missing" in strict mode only (A22
# failure mode). In template mode (.env.example) empty values are expected.
if [[ "$MODE" == "strict" ]]; then
  empty_keys="$(
    grep -E '^[A-Z_][A-Z0-9_]*=[[:space:]]*$' "$ENV_FILE" \
      | sed -E 's/=.*$//' \
      | sort -u || true
  )"
else
  empty_keys=""
fi

missing_required=()
missing_optional=()

while IFS=$'\t' read -r var has_default; do
  [[ -z "$var" ]] && continue
  if grep -qxF "$var" <<< "$defined" && ! grep -qxF "$var" <<< "$empty_keys"; then
    continue
  fi
  if [[ "$has_default" == "1" ]]; then
    missing_optional+=("$var")
  else
    missing_required+=("$var")
  fi
done <<< "$placeholders"

# Reverse check: keys defined in env but not referenced in yml (dead vars).
referenced="$(awk -F'\t' '{print $1}' <<< "$placeholders" | sort -u)"
dead=()
while IFS= read -r key; do
  [[ -z "$key" ]] && continue
  if ! grep -qxF "$key" <<< "$referenced"; then
    dead+=("$key")
  fi
done <<< "$defined"

echo "env-lint [$MODE]: $ENV_FILE ↔ $YML"
echo "  placeholders: $(wc -l <<< "$placeholders" | tr -d ' ')"
echo "  defined:      $(wc -l <<< "$defined" | tr -d ' ')"

status=0

if (( ${#missing_required[@]} > 0 )); then
  echo
  echo "MISSING REQUIRED (no default in yml — app will fail to start):"
  printf '  - %s\n' "${missing_required[@]}"
  status=1
fi

if (( ${#missing_optional[@]} > 0 )); then
  echo
  echo "missing optional (has default in yml — will use default):"
  printf '  - %s\n' "${missing_optional[@]}"
fi

if (( ${#dead[@]} > 0 )); then
  echo
  echo "warning: defined in env but not referenced in yml:"
  printf '  - %s\n' "${dead[@]}"
fi

if (( status == 0 )); then
  echo
  echo "ok: all required placeholders have non-empty values"
fi

exit "$status"
