#!/usr/bin/env sh
set -eu

expected_cli="$(node -p 'require("./package.json").devDependencies["@n8n/node-cli"]')"
version="$(node -p 'require("./package.json").version')"
tarball="release/n8n-nodes-ibmi-mapepire-${version}.tgz"

cleanup_failed_release() {
	status=$?
	if [ "$status" -ne 0 ]; then
		rm -f "$tarball" "${tarball}.sha256"
		printf '\nRelease build failed. No installable tarball was retained.\n' >&2
	fi
	exit "$status"
}
trap cleanup_failed_release EXIT INT TERM

rm -rf node_modules dist .test-dist release
mkdir -p release

if [ "${RESET_LOCKFILE:-0}" = "1" ]; then
	rm -f package-lock.json
fi

printf '\n[1/7] Installing exact development toolchain...\n'
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

printf '\n[2/7] Running lint, build, tests, type checks and security audits...\n'
npm run ci:verify

printf '\n[3/7] Creating npm tarball...\n'
npm pack --pack-destination release

printf '\n[4/7] Verifying exact tarball contents and compiled entry points...\n'
node tools/verify-tarball.mjs "$tarball"

printf '\n[5/7] Writing SHA-256 checksum...\n'
sha256sum "$tarball" > "${tarball}.sha256"

printf '\n[6/7] Confirming release artifact is non-empty...\n'
test -s "$tarball"
test -s "${tarball}.sha256"

printf '\n[7/7] Release completed successfully.\n'
trap - EXIT INT TERM
printf 'Release artifact: %s\n' "$tarball"
printf 'Release checksum: %s\n' "${tarball}.sha256"
