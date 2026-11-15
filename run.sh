#!/usr/bin/env bash
# Sets up anything missing (Python venv + Playwright, npm packages), then starts
# the API and the frontend together. Ctrl-C stops both.
#
# Usage: ./run.sh            (API on $PORT or 5001, frontend on 5173)
#        PORT=5002 ./run.sh
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$PWD"
VENV="$ROOT/.venv"
PORT="${PORT:-5001}"

say() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# --- Python -----------------------------------------------------------------
# pip needs a Python built with SSL; some pyenv builds lack it, so test each candidate.
find_python() {
  local py
  for py in "${PYTHON_BOOTSTRAP:-}" python3 /usr/bin/python3 python; do
    [ -n "$py" ] || continue
    command -v "$py" >/dev/null 2>&1 || continue
    if "$py" -c 'import ssl, venv' >/dev/null 2>&1; then
      echo "$py"
      return 0
    fi
  done
  return 1
}

if [ ! -x "$VENV/bin/python" ] || ! "$VENV/bin/python" -c 'import ssl' >/dev/null 2>&1; then
  BOOT="$(find_python)" || die "No Python 3 with SSL support found. Install one (e.g. brew install python) or set PYTHON_BOOTSTRAP=/path/to/python3."
  say "Creating Python virtual environment with $BOOT"
  rm -rf "$VENV"
  "$BOOT" -m venv "$VENV"
fi

STAMP="$VENV/.requirements-installed"
if [ ! -f "$STAMP" ] || [ requirements.txt -nt "$STAMP" ]; then
  say "Installing Python packages"
  "$VENV/bin/pip" install --quiet --upgrade pip
  "$VENV/bin/pip" install --quiet -r requirements.txt
  say "Installing Playwright's Chromium (skipped if already downloaded)"
  "$VENV/bin/playwright" install chromium
  touch "$STAMP"
fi

# --- Node -------------------------------------------------------------------
command -v npm >/dev/null 2>&1 || die "npm not found. Install Node.js (e.g. brew install node)."

if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  say "Installing backend npm packages"
  npm install --silent && touch node_modules
fi
if [ ! -d frontend/node_modules ] || [ frontend/package.json -nt frontend/node_modules ]; then
  say "Installing frontend npm packages"
  npm --prefix frontend install --silent && touch frontend/node_modules
fi

# --- Start ------------------------------------------------------------------
pids=()
cleanup() {
  trap - INT TERM EXIT
  say "Stopping servers"
  kill "${pids[@]}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

say "Starting API on http://localhost:$PORT"
PORT="$PORT" PYTHON="$VENV/bin/python" node server.js &
pids+=($!)

say "Starting frontend (Vite prints the URL below)"
(cd frontend && API_URL="http://localhost:$PORT" exec ./node_modules/.bin/vite) &
pids+=($!)

# Exit (and stop the other) as soon as either server dies.
while kill -0 "${pids[0]}" 2>/dev/null && kill -0 "${pids[1]}" 2>/dev/null; do
  sleep 1
done
die "A server exited unexpectedly; see the output above."
