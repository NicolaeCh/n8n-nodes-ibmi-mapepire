#!/usr/bin/env sh
set -eu

expected_cli="$(node -p 'require("./package.json").devDependencies["@n8n/node-cli"]')"
version="$(node -p 'require("./package.json").version')"
tarball="release/n8n-nodes-ibmi-mapepire-${version}.tgz"

rm -rf node_modules dist .test-dist release
mkdir -p release

if [ "${RESET_LOCKFILE:-0}" = "1" ]; then
	rm -f package-lock.json
fi

if [ -f package-lock.json ]; then
	npm ci --no-audit --no-fund
else
	npm install --no-audit --no-fund
fi

actual_cli="$(node -p "require('./node_modules/@n8n/node-cli/package.json').version")"
if [ "$actual_cli" != "$expected_cli" ]; then
	echo "Expected @n8n/node-cli $expected_cli, found $actual_cli" >&2
	exit 1
fi

npm run ci:verify
npm pack --pack-destination release
node tools/verify-tarball.mjs "$tarball"
sha256sum "$tarball" > "${tarball}.sha256"

printf 'Release artifact created: %s\n' "$tarball"
printf 'Release checksum created: %s\n' "${tarball}.sha256"
