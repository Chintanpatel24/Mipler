#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Mipler — Local OSINT Investigation Wall
# Run:  bash start.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PORT="${PORT:-3000}"
BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; RESET="\033[0m"

log()  { echo -e "${GREEN}[mipler]${RESET} $*"; }
warn() { echo -e "${YELLOW}[mipler]${RESET} $*"; }
err()  { echo -e "${RED}[mipler]${RESET} $*" >&2; }

echo ""
echo -e "${BOLD}  MIPLER — Local OSINT Investigation Wall${RESET}"
echo -e "  Ollama-only · fully offline · no API keys"
echo ""

# ── 1. Check Node.js ──────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  err "Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi
NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
if [ "$MAJOR" -lt 18 ]; then
  err "Node.js v18+ required (found v$NODE_VER)"
  exit 1
fi
log "Node.js v$NODE_VER ✓"

# ── 2. Install dependencies if needed ────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  log "Installing dependencies…"
  npm install --silent
fi

# ── 3. Build if dist is missing or stale ─────────────────────────────────────
REBUILD=false
if [ ! -d "dist" ]; then
  REBUILD=true
fi
# Rebuild if any source file is newer than dist
if [ "$REBUILD" = false ] && [ -d "src" ]; then
  if find src -newer dist/index.html -name "*.ts" -o -name "*.tsx" -o -name "*.css" 2>/dev/null | grep -q .; then
    REBUILD=true
  fi
fi

if [ "$REBUILD" = true ]; then
  log "Building Mipler…"
  npm run build
  log "Build complete ✓"
fi

# ── 4. Check Ollama (optional — warn but don't block) ────────────────────────
OLLAMA_URL="${OLLAMA_HOST:-http://localhost:11434}"
if curl -sf "$OLLAMA_URL/api/tags" &>/dev/null; then
  MODELS=$(curl -sf "$OLLAMA_URL/api/tags" | grep -o '"name":"[^"]*"' | head -3 | sed 's/"name":"//g;s/"//g' | tr '\n' ' ')
  log "Ollama detected at $OLLAMA_URL ✓  (models: ${MODELS:-none pulled yet})"
else
  warn "Ollama not running at $OLLAMA_URL"
  warn "Start it with:  OLLAMA_ORIGINS=* ollama serve"
  warn "Pull a model:   ollama pull llama3"
  warn "(You can still open Mipler — AI features will connect once Ollama is up)"
fi

# ── 5. Security: bind to localhost only ───────────────────────────────────────
HOST="${HOST:-127.0.0.1}"
if [ "$HOST" != "127.0.0.1" ] && [ "$HOST" != "localhost" ]; then
  warn "Binding to $HOST — make sure this is intentional (default is localhost)"
fi

# ── 6. Launch ─────────────────────────────────────────────────────────────────
echo ""
log "Starting Mipler on http://localhost:${PORT}"
log "Press Ctrl+C to stop"
echo ""

HOST="$HOST" PORT="$PORT" node server.js
