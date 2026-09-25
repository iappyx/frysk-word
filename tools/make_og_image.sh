#!/bin/bash
# Renders tools/og-image.html to assets/og-image.jpg (1200x630), the link-preview image
# that WhatsApp, Telegram etc. show when the website is shared. Needs Google Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Google Chrome not found at $CHROME"; exit 1; }
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --screenshot="$PWD/assets/og-image.tmp.png" "file://$PWD/tools/og-image.html" >/dev/null 2>&1
# JPEG keeps it small: WhatsApp may skip preview images larger than ~300 KB
sips -s format jpeg -s formatOptions 85 assets/og-image.tmp.png --out assets/og-image.jpg >/dev/null
rm assets/og-image.tmp.png
echo "Wrote assets/og-image.jpg ($(( $(stat -f%z assets/og-image.jpg) / 1024 )) KB; keep it under ~300 KB)"
