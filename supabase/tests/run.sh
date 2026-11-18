#!/usr/bin/env bash
# Runs every migration on a throwaway Postgres cluster, applies the newest one
# twice (it must be re-runnable), then runs the RLS tests in this folder.
#
#   bash supabase/tests/run.sh            # uses initdb/pg_ctl/psql from PATH
#   PG_BIN="/c/Program Files/PostgreSQL/16/bin" bash supabase/tests/run.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
migrations="$here/../migrations"
bin="${PG_BIN:+$PG_BIN/}"
port="${PG_TEST_PORT:-54329}"
data="$(mktemp -d)"

cleanup() { "${bin}pg_ctl" -D "$data" -m fast stop >/dev/null 2>&1 || true; rm -rf "$data"; }
trap cleanup EXIT

"${bin}initdb" -D "$data" -U postgres -A trust -E UTF8 --locale=C >/dev/null
"${bin}pg_ctl" -D "$data" -o "-p $port -c listen_addresses=localhost" -l "$data/server.log" -w start >/dev/null

export PGCLIENTENCODING=UTF8
psql_run() { "${bin}psql" -h localhost -p "$port" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t; }

# Files are piped through stdin: psql on Windows mangles non-ASCII paths.
echo 'alter database postgres set search_path = "$user", public, extensions;' | psql_run
psql_run < "$here/00_supabase_stub.sql"

files=("$migrations"/*.sql)
for file in "${files[@]}"; do
    echo "migration  $(basename "$file")"
    psql_run < "$file" 2>/dev/null
done
echo "re-run     $(basename "${files[-1]}")"
psql_run < "${files[-1]}" 2>/dev/null

for test in "$here"/*.test.sql; do
    echo "test       $(basename "$test")"
    psql_run < "$test" 2>&1 | grep -E 'PASS|FAIL|ERROR|ALL TESTS' | sed -E 's/^.*(PASS|FAIL)  /  \1  /'
done
