# scripts/

Operational helpers for REINASLEO. Each script is intended to be run from the repo root.

## `check-env.sh` — env-variable lint

Verifies that every `${VAR}` placeholder in `apps/api/src/main/resources/application.yml` has a corresponding entry in the target env file. Prevents incidents like a missing `DB_URL` on production startup.

```bash
scripts/check-env.sh --template          # check apps/api/.env.example, keys only
scripts/check-env.sh apps/api/.env       # check local .env, values must be non-empty
scripts/check-env.sh /etc/reinasleo/api.env  # check prod (run on the server)
```

Exit 0 = OK, 1 = required var missing, 2 = bad arguments.

## `backup-db.sh` — nightly Postgres dump

Writes `dump-YYYYMMDD-HHMMSS.sql.gz` to `$BACKUP_DIR` (default `/var/backups/reinasleo`). Keeps the most recent `$RETENTION_DAYS` files (default 7).

```bash
# Make executable once after install (sandbox cannot do it):
chmod +x scripts/backup-db.sh

# Run manually:
scripts/backup-db.sh

# Override defaults:
BACKUP_DIR=/srv/backups RETENTION_DAYS=14 scripts/backup-db.sh
```

DB connection comes from standard libpq env: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`. Use `~/.pgpass` (chmod 600) on the server rather than exporting `PGPASSWORD` in shell history.

### Crontab

Run as a user that can read `~/.pgpass` and write to the backup dir.

```cron
# /etc/cron.d/reinasleo-backup
0 3 * * *  reinasleo  /opt/reinasleo/scripts/backup-db.sh >> /var/log/reinasleo-backup.log 2>&1
```

Verify weekly:

```bash
tail -n 20 /var/log/reinasleo-backup.log
ls -lh /var/backups/reinasleo/
```

### Restore drill

Do this once a quarter on a staging box, otherwise the backups are theatre.

```bash
gunzip -c /var/backups/reinasleo/dump-YYYYMMDD-HHMMSS.sql.gz \
  | psql --host=staging-db --username=reinasleo --dbname=reinasleo_restore
```

### Offsite (optional)

The script has a commented `aws s3 cp` block at the bottom. Provision an S3 bucket + IAM role, set `REINASLEO_BACKUP_BUCKET`, then uncomment.

## Monitoring

### Liveness

`/actuator/health` is public and returns 200 + JSON status. Point an external uptime monitor at it:

- [UptimeRobot](https://uptimerobot.com/) — 5-min HTTP check on `https://api.reinasleo.com/actuator/health`.
- Alert on 5xx, non-200, or response time > 5 s.

### Prometheus scrape

`/actuator/prometheus` is exposed via `management.endpoints.web.exposure.include` and gated by `MetricsAuthFilter`, which checks the `X-Metrics-Secret` header against `METRICS_SECRET` using `MessageDigest.isEqual`.

Example scrape config (`prometheus.yml`):

```yaml
scrape_configs:
  - job_name: reinasleo-api
    metrics_path: /actuator/prometheus
    scheme: https
    scrape_interval: 30s
    static_configs:
      - targets: ['api.reinasleo.com']
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/reinasleo-metrics-secret
    # If you cannot send Authorization (older agents), use a custom header:
    # http_headers:
    #   X-Metrics-Secret:
    #     values: ['REPLACE_FROM_VAULT']
```

Recommended alerts (Alertmanager / Grafana):

- `up == 0` for 2 min — instance down.
- `rate(http_server_requests_seconds_count{status=~"5.."}[5m]) > 0.1` — 5xx burst.
- `hikaricp_connections_pending > 0` for 5 min — DB pool starved.
- `jvm_memory_used_bytes / jvm_memory_max_bytes > 0.85` for 10 min — heap pressure.

### Logs

Production uses JSON via `logback-spring.xml` under the `prod` profile. Ship to Loki / CloudWatch / Datadog with the entire JSON record; emails are masked at log time, so logs are safe to retain.
