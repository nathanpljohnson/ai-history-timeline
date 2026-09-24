#!/bin/bash
# Re-import from Obsidian and push to GitHub Pages if the events changed.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."

node scripts/extract-obsidian-events.mjs

if git diff --quiet -I '"generatedAt"' -- data/events.json; then
  git checkout -- data/events.json
  echo "$(date '+%F %T') no changes"
  exit 0
fi

git add data/events.json
git commit -q -m "Update timeline from Obsidian ($(date +%F))"
git push -q origin main
echo "$(date '+%F %T') published"
