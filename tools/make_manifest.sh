#!/bin/bash
# Writes manifest.xml for the address where the add-in is hosted.
# Usage: bash tools/make_manifest.sh https://YOURNAME.github.io/iepen-fryske-stavering/
set -euo pipefail
cd "$(dirname "$0")/.."
URL="${1:-}"
[ -n "$URL" ] || { echo "Usage: bash tools/make_manifest.sh https://YOURNAME.github.io/iepen-fryske-stavering/"; exit 1; }
case "$URL" in https://*) ;; *) echo "The address must start with https://"; exit 1 ;; esac
case "$URL" in */) ;; *) URL="$URL/" ;; esac
ORIGIN="$(printf '%s' "$URL" | awk -F/ '{print $1"//"$3}')"
sed -e "s#{{BASE_URL}}#$URL#g" -e "s#{{ORIGIN}}#$ORIGIN#g" manifest.template.xml > manifest.xml
echo "Wrote manifest.xml for $URL"
