---
tags:
  - reinasleo
  - инфраструктура
  - deploy
  - workflow
updated: 2026-04-23
---

# 🚀 Deploy Workflow (нормальный)

> Стандартная процедура деплоя изменений в production. Для emergency hot fix → vault: `Reinasleo Web/Workflows/Hot Fix Deploy.md`.

## Принципы

1. **Deploy только по явной команде пользователя** (CLAUDE.md правило)
2. **Push в git** → **pull на сервере** (никогда не push'ить файлы напрямую)
3. **Один сервис за раз** (если нет dependencies)
4. **Verify после deploy** (curl, journalctl, systemctl)
5. **Backup перед DB изменениями**

## Типы deploy

| Тип | Что меняется | Команды |
|-----|--------------|---------|
| **Bot only** | `leo_bot/` | git pull + systemctl restart |
| **API only** | `leo_web/apps/api/` | git pull + gradle build + systemctl restart |
| **Web only** | `leo_web/apps/web/` | git pull + npm install + npm build + systemctl restart |
| **Web + API** | оба | оба deploy последовательно |
| **DB migration** | `db/migration/` | API deploy (Flyway auto-applies) + ⚠️ backup ДО |
| **Config change** | `/etc/reinasleo/*.env` или systemd unit | sed/edit + systemctl reload + restart |
| **nginx change** | `/etc/nginx/sites-enabled/reinasleo` | edit + nginx -t + nginx reload |

## 🤖 Bot Deploy

```bash
ssh reinasleo '
  cd /opt/reinasleo/leo_bot && \
  git pull origin main && \
  systemctl restart reinasleo-bot && \
  sleep 3 && \
  systemctl is-active reinasleo-bot
'

# Verify polling
ssh reinasleo 'journalctl -u reinasleo-bot -n 10 --no-pager | grep -i polling | tail -3'
```

**Время**: 5-10 секунд.

> Если изменились deps в `requirements.txt` — нужен `venv/bin/pip install -r requirements.txt` перед restart:

```bash
ssh reinasleo '
  cd /opt/reinasleo/leo_bot && \
  git pull origin main && \
  venv/bin/pip install -r requirements.txt && \
  systemctl restart reinasleo-bot
'
```

### Persistent state (A32a + A32b, 2026-04-23)

Unit `reinasleo-bot.service` **обязан содержать** (иначе FSM/support-state запись упадёт под `ProtectSystem=strict`):

```ini
[Service]
...
Environment=STATE_FILE_PATH=/var/lib/reinasleo-bot/state.json
Environment=SUPPORT_STATE_PATH=/var/lib/reinasleo-bot/support_state.json
StateDirectory=reinasleo-bot
```

`StateDirectory=reinasleo-bot` создаёт `/var/lib/reinasleo-bot/` с owner `User=/Group=` перед стартом. Файлы пишутся там. Bot без этих настроек падает при первом FSM-событии или support-flush'е.

Verify перед deploy'ем если редактируешь unit:
```bash
ssh reinasleo 'ls -la /var/lib/reinasleo-bot/ && cat /etc/systemd/system/reinasleo-bot.service | grep -E "StateDirectory|STATE_FILE_PATH|SUPPORT_STATE_PATH"'
```

### Git history rewritten (редкий случай)

Если prod-HEAD не в `origin/main` (после force-push в leo_bot — например, A16 рерайтнул история для чистки секретов), `git pull` откажется fast-forward'ить. Лечится:

```bash
ssh reinasleo 'cd /opt/reinasleo/leo_bot && git fetch origin && git reset --hard origin/main'
```

**Безопасно только если** prod-работа уже ре-committed в rewritten history (обычно так и есть — force-push делается после того, как security-rerun применил тот же патч). **Проверить** `git log origin/main..HEAD` — должно быть пусто или только "abandoned" старые варианты тех же commits.

## ☕ API Deploy

```bash
ssh reinasleo '
  cd /opt/reinasleo/leo_web && \
  git pull origin main && \
  cd apps/api && \
  GRADLE_OPTS="-Xmx512m" ./gradlew build -x test --no-daemon && \
  systemctl restart reinasleo-api && \
  sleep 5 && \
  systemctl is-active reinasleo-api
'

# Verify
curl -I https://reinasleo.com/api/health
```

**Время**: 30 секунд - 2 минуты (gradle build).

**Параметры build**:
- `GRADLE_OPTS="-Xmx512m"` — лимит для 2GB сервера, иначе OOM
- `-x test` — пропускаем тесты на проде (бывают флаки и тест БД ≠ prod БД)
- `--no-daemon` — без gradle daemon (он жрёт RAM persistently)

> **DB миграции** применяются **автоматически** при старте Spring Boot (Flyway). Если есть новые миграции `V{N}__*.sql` — они применятся.

## 🌐 Web Deploy

```bash
ssh reinasleo '
  cd /opt/reinasleo/leo_web && \
  git pull origin main && \
  cd apps/web && \
  npm install && \
  npm run build && \
  systemctl restart reinasleo-web
'

# Verify
curl -I https://reinasleo.com/ru
```

**Время**: 1-3 минуты (npm install + next build).

> **npm install** обновляет node_modules согласно package-lock.json. **Не пропускай** даже если кажется что зависимостей не менялось — Lock file мог обновиться.
>
> **next build** — это **production optimized build**, генерит `.next/standalone`. Без этого новый код не подхватится.

## 🌐+☕ Combined Deploy (Web + API)

Сначала API (web depends on API), потом Web:

```bash
ssh reinasleo '
  cd /opt/reinasleo/leo_web && git pull origin main && \
  cd apps/api && GRADLE_OPTS="-Xmx512m" ./gradlew build -x test --no-daemon && \
  systemctl restart reinasleo-api && sleep 5 && systemctl is-active reinasleo-api && \
  cd ../web && npm install && npm run build && \
  systemctl restart reinasleo-web
'

# Verify both
curl -s -o /dev/null -w "API: %{http_code}\n" https://reinasleo.com/api/health
curl -s -o /dev/null -w "Web: %{http_code}\n" https://reinasleo.com/ru
```

**Время**: 2-5 минут.

## 🗄️ DB Migration Deploy

```bash
# 1. BACKUP перед миграцией
ssh reinasleo '/opt/reinasleo/backup-db.sh && ls -lt /opt/reinasleo/backups/ | head -3'

# 2. API deploy (это и применит миграцию)
ssh reinasleo '
  cd /opt/reinasleo/leo_web && git pull origin main && \
  cd apps/api && GRADLE_OPTS="-Xmx512m" ./gradlew build -x test --no-daemon && \
  systemctl restart reinasleo-api && sleep 5 && systemctl is-active reinasleo-api
'

# 3. Verify migration applied
ssh reinasleo 'journalctl -u reinasleo-api -n 100 --no-pager | grep -i flyway | tail -10'
ssh reinasleo 'sudo -u postgres psql -d reinasleo -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 3;"'
```

См. vault: `Reinasleo Web/Workflows/Add Migration.md` для деталей.

## ⚙️ Config Deploy (env vars)

```bash
# Backup
ssh reinasleo 'cp /etc/reinasleo/api.env /etc/reinasleo/api.env.backup-$(date +%Y%m%d-%H%M%S)'

# Edit (либо через sed для одного значения, либо через nano для multi-line)
ssh reinasleo 'sed -i "s|VAR=old_value|VAR=new_value|" /etc/reinasleo/api.env'
# или интерактивно:
ssh reinasleo 'nano /etc/reinasleo/api.env'

# Restart
ssh reinasleo 'systemctl restart reinasleo-api && sleep 5 && systemctl is-active reinasleo-api'
```

## ⚙️ Systemd unit Deploy

```bash
# Backup
ssh reinasleo 'cp /etc/systemd/system/reinasleo-api.service /etc/systemd/system/reinasleo-api.service.backup-$(date +%Y%m%d-%H%M%S)'

# Edit
ssh reinasleo 'nano /etc/systemd/system/reinasleo-api.service'

# Reload + restart
ssh reinasleo 'systemctl daemon-reload && systemctl restart reinasleo-api'
```

## 🌐 nginx Deploy

```bash
# Backup
ssh reinasleo 'cp /etc/nginx/sites-enabled/reinasleo /etc/nginx/sites-enabled/reinasleo.backup-$(date +%Y%m%d-%H%M%S)'

# Edit
ssh reinasleo 'nano /etc/nginx/sites-enabled/reinasleo'

# Validate
ssh reinasleo 'nginx -t'

# Reload (graceful, без downtime)
ssh reinasleo 'systemctl reload nginx'
```

> **`nginx -t` обязательно**. Без валидации можно сломать nginx и потом не поднять без console доступа.
> **`reload` а не `restart`** — graceful, новые connections используют новый config, старые доделываются на старом.

## Verify After Deploy

Стандартный verify скрипт:

```bash
ssh reinasleo '
  echo "=== Services ==="
  systemctl is-active reinasleo-api reinasleo-web reinasleo-bot nginx postgresql
  echo "=== HTTP probes ==="
  curl -s -o /dev/null -w "  https://reinasleo.com/api/health → %{http_code}\n" https://reinasleo.com/api/health
  curl -s -o /dev/null -w "  https://reinasleo.com/ru → %{http_code}\n" https://reinasleo.com/ru
  echo "=== Recent errors ==="
  journalctl -u reinasleo-api --since "5 min ago" | grep -i error | tail -5
'
```

Все 5 сервисов → `active`, оба curl → `200`, errors → пусто = **deploy успешен**.

## Откат

При проблеме:

```bash
# 1. Найти предыдущий коммит
ssh reinasleo 'cd /opt/reinasleo/leo_web && git log --oneline -5'

# 2. Checkout
ssh reinasleo 'cd /opt/reinasleo/leo_web && git checkout PREVIOUS_HASH'

# 3. Rebuild + restart соответствующего сервиса
# (см. секции выше)
```

## Чеклист перед deploy

- [ ] Локально тест прошёл (`npm run build`, `./gradlew test`, `pytest`)
- [ ] Изменения commit'ed и push'ed
- [ ] Если DB migration — backup сделан
- [ ] Получено явное разрешение пользователя
- [ ] Знаю как откатить если что-то пойдёт не так
- [ ] Verify скрипт готов к запуску после deploy

## См. также

Все доки ниже — в Obsidian-vault `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Reinasleo Web/`:

- `Workflows/Hot Fix Deploy.md`
- `Инфраструктура/Сервер.md`
- `Инфраструктура/Бэкапы.md`
- `Инфраструктура/Мониторинг.md`
- `Troubleshooting/API down.md`
- `Troubleshooting/Site down.md`
