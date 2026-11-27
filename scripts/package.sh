#!/usr/bin/env bash
# Build a clean source archive of the project.
# Excludes dependencies, build output, runtime data and any secret material.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./package.json').version")"
OUT="ibsam-portfolio-${VERSION}.zip"

python3 - "$OUT" <<'PY'
import os
import sys
import zipfile

out = sys.argv[1]
skip_dirs = {'node_modules', '.git', 'dist', 'data', 'uploads', '.tmp', 'coverage', '.vite'}
skip_suffix = ('.db', '.db-wal', '.db-shm', '.sqlite', '.sqlite3', '.log', '.zip', '.tsbuildinfo')
skip_names = {'.env', '.DS_Store'}

count = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
    for root, dirs, files in os.walk('.'):
        dirs[:] = sorted(d for d in dirs if d not in skip_dirs)
        for name in sorted(files):
            if name in skip_names or name.endswith(skip_suffix):
                continue
            full = os.path.join(root, name)
            if os.path.islink(full):
                continue
            archive.write(full, os.path.relpath(full, '.'))
            count += 1

print(f'Created {out} with {count} files')
PY

unzip -l "$OUT" | tail -2
