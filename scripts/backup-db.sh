#!/usr/bin/env bash
# backup-db.sh — nightly pg_dump for the reinasleo database.
#
# - Writes gzipped SQL dumps to $BACKUP_DIR (default /var/backups/reinasleo).
# - Keeps the last 7 daily dumps; older files are pruned.
# - Reads DB connection from PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE
#   or from $REPO_ROOT/apps/api/.env if present.
#
# Usage:
#   scripts/backup-db.sh                 # use env / defaults
#   BACKUP_DIR=/srv/backups scripts/backup-db.sh
#
# Exit codes: 0 ok, 1 dump failed, 2 misconfiguration.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/reinasleo}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-reinasleo}"
PGDATABASE="${PGDATABASE:-reinasleo}"
# PGPASSWORD comes from env or pgpass; do not echo it.

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "backup-db: pg_dump not installed" >&2
  exit 2
fi

mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DUMP_FILE="$BACKUP_DIR/dump-$TIMESTAMP.sql.gz"
TMP_FILE="$DUMP_FILE.partial"

trap 'rm -f "$TMP_FILE"' EXIT

pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip -9 > "$TMP_FILE"

mv "$TMP_FILE" "$DUMP_FILE"
chmod 640 "$DUMP_FILE"

echo "backup-db: wrote $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

# Retention: keep the last N daily dumps, prune the rest.
find "$BACKUP_DIR" -maxdepth 1 -name 'dump-*.sql.gz' -type f -mtime "+$RETENTION_DAYS" -print -delete \
  | sed 's/^/backup-db: pruned /'

# Optional offsite copy. Uncomment and set $REINASLEO_BACKUP_BUCKET in env.
# TODO: enable on prod once IAM role + bucket are provisioned.
# if [[ -n "${REINASLEO_BACKUP_BUCKET:-}" ]] && command -v aws >/dev/null 2>&1; then
#   aws s3 cp "$DUMP_FILE" "s3://$REINASLEO_BACKUP_BUCKET/$(basename "$DUMP_FILE")" \
#     --storage-class STANDARD_IA
# fi
