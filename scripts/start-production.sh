#!/bin/sh
set -eu

export NODE_ENV="${NODE_ENV:-production}"
export API_HOST="${API_HOST:-127.0.0.1}"
export API_PORT="${API_PORT:-4000}"
export ASTRACODE_DATA_DIR="${ASTRACODE_DATA_DIR:-./data}"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:4000}"

pnpm --filter @astracode/api start &
cd apps/web
exec pnpm exec next start -H 0.0.0.0 -p "${PORT:-3000}"
