#!/bin/bash
# Re-creates dict/ from the official download of the word list (Hunspell format):
# downloads it, converts the Hunspell files to UTF-8, and copies README/licence.
# Usage: bash tools/update_dictionary.sh [path/to/downloaded-addon.zip]
set -euo pipefail
cd "$(dirname "$0")/.."
URL="https://beheer.frysker.nl/wp-content/uploads/2024/12/fy_NL-20160722.oxt_.zip"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
if [ -n "${1:-}" ]; then cp "$1" "$WORK/download"; else curl -fL --retry 3 -o "$WORK/download" "$URL"; fi
mkdir -p "$WORK/u"; unzip -q -o "$WORK/download" -d "$WORK/u"
for i in 1 2 3; do
  found=0
  while IFS= read -r a; do found=1; mkdir -p "${a%.*}.d"; unzip -q -o "$a" -d "${a%.*}.d"; rm -f "$a"; done \
    < <(find "$WORK/u" -type f \( -iname '*.oxt' -o -iname '*.zip' \))
  [ "$found" = 1 ] || break
done
AFF="$(find "$WORK/u" -name fy_NL.aff | head -n1)"; DIC="$(find "$WORK/u" -name fy_NL.dic | head -n1)"
[ -n "$AFF" ] && [ -n "$DIC" ] || { echo "fy_NL.aff/.dic not found in the add-on"; exit 1; }
ENC="$(LC_ALL=C grep -m1 '^SET ' "$AFF" | awk '{print $2}' | tr -d '\r' || true)"; [ -n "$ENC" ] || ENC=ISO-8859-1
mkdir -p dict
iconv -f "$ENC" -t UTF-8 "$DIC" > dict/fy_NL.dic
{ printf 'SET UTF-8\n'; iconv -f "$ENC" -t UTF-8 "$AFF" | LC_ALL=C grep -v '^SET '; } > dict/fy_NL.aff
R="$(find "$WORK/u" -name 'README*' | head -n1)"; [ -n "$R" ] && cp "$R" dict/README.txt
G="$(find "$WORK/u" -name 'gpl*.txt' | head -n1)"; [ -n "$G" ] && cp "$G" dict/gpl.txt
echo "dict/ updated: $(head -n1 dict/fy_NL.dic | awk '{print $1}') words"
