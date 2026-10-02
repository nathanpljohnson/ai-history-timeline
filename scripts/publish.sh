#!/bin/bash
# Re-import from Obsidian and push to GitHub Pages if the events changed.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")/.."

git pull -q --ff-only origin main
node scripts/extract-obsidian-events.mjs

if git diff --quiet -I '"generatedAt"' -- data/events.json; then
  git checkout -- data/events.json data/events-data.js
  echo "$(date '+%F %T') no changes"
  exit 0
fi

npm run --silent audit > /dev/null || echo "$(date '+%F %T') audit flagged issues (see npm run audit)"
git add data/events.json data/events-data.js
git commit -q -m "Update timeline from Obsidian ($(date +%F))"
git push -q origin main
echo "$(date '+%F %T') published"
