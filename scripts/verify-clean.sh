#!/usr/bin/env sh
set -eu

rm -rf node_modules dist .test-dist release

if [ "${RESET_LOCKFILE:-0}" = "1" ]; then
	rm -f package-lock.json
fi

if [ -f package-lock.json ]; then
	npm ci --no-audit --no-fund
else
	npm install --no-audit --no-fund
fi

npm run ci:verify
