#!/bin/bash
# Adds the add-in to Word for Mac (sideloading). Run after make_manifest.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f manifest.xml ] || { echo "manifest.xml not found. Run: bash tools/make_manifest.sh https://YOURNAME.github.io/iepen-fryske-stavering/"; exit 1; }
WEF="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"
mkdir -p "$WEF"
cp manifest.xml "$WEF/iepen-fryske-stavering.xml"
echo "Installed in Word. Quit Word completely (Cmd+Q) and open it again;"
echo "then choose Home > Iepen Fryske Stavering (or Home > Add-ins; in older Word: Insert > My Add-ins)."
echo "To remove it:  rm \"$WEF/iepen-fryske-stavering.xml\""
