#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local
if [ ! -f .local/postgres/PG_VERSION ]; then
  initdb -D "$PWD/.local/postgres" -A trust --no-locale -E UTF8 >/dev/null
fi
if ! pg_isready -h 127.0.0.1 -p 55431 >/dev/null; then
  pg_ctl -D "$PWD/.local/postgres" -l "$PWD/.local/postgres.log" -o "-p 55431 -h 127.0.0.1 -k $PWD/.local" start -w -t 30
fi
for db in supa1_control supa1_target; do
  if ! psql -h 127.0.0.1 -p 55431 -d postgres -Atc "select 1 from pg_database where datname='$db'" | rg -q 1; then
    createdb -h 127.0.0.1 -p 55431 "$db"
  fi
done
