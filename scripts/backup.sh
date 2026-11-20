#!/usr/bin/env sh
# Nightly backup for the VPS (doc 08). Crontab example (03:15 every night):
#   15 3 * * * cd /srv/lppeptide/app && ./scripts/backup.sh >> /srv/lppeptide/backups/backup.log 2>&1
# Then sync the backups folder offsite, e.g.:  rclone sync /srv/lppeptide/backups remote:lppeptide-backups
set -eu
cd "$(dirname "$0")/.."
date -u +"%Y-%m-%dT%H:%M:%SZ backup start"
npm run --silent backup
