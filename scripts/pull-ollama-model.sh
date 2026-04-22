#!/usr/bin/env bash
# =============================================================================
# Chesapeake City Chatbot — Ollama Model Pull Script
# =============================================================================
# This script ensures the required Ollama model is available.
# It can be run from the host or inside the Ollama container.
#
# Usage:
#   # From host (after container is running):
#   docker exec chatbot-ollama bash /app/scripts/pull-ollama-model.sh
#
#   # Or copy to container and run:
#   docker cp scripts/pull-ollama-model.sh chatbot-ollama:/tmp/
#   docker exec chatbot-ollama bash /tmp/pull-ollama-model.sh
#
#   # Or run directly in container (if added to Dockerfile):
#   /app/scripts/pull-ollama-model.sh
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Configuration ─────────────────────────────────────────────────────────────
# Default model (can be overridden by environment variable)
MODEL="${EMBEDDING_MODEL:-qwen2.5:1.5b}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-120}"  # Maximum time to wait for Ollama
CHECK_INTERVAL="${CHECK_INTERVAL:-2}"        # Seconds between checks

# ── Functions ─────────────────────────────────────────────────────────────────

# Check if Ollama is ready to accept commands
check_ollama_ready() {
    if ollama list >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if the model already exists
check_model_exists() {
    local model="$1"
    if ollama list 2>/dev/null | grep -q "$model"; then
        return 0
    else
        return 1
    fi
}

# Pull the model with progress indication
pull_model() {
    local model="$1"
    info "Pulling model: $model"

    # Start the pull in background to show progress
    ollama pull "$model" &
    local pull_pid=$!

    # Show progress dots while waiting
    local dots=""
    while kill -0 "$pull_pid" 2>/dev/null; do
        echo -n "."
        sleep 5
        dots="${dots}."
        # Limit dots to 60 per line
        if [ ${#dots} -ge 60 ]; then
            echo ""
            dots=""
        fi
    done

    # Wait for the pull to finish and get exit code
    wait "$pull_pid" || return 1
    echo ""
    return 0
}

# ── Main script ───────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "=============================================="
    echo "  Ollama Model Setup: $MODEL"
    echo "=============================================="
    echo ""

    # ── 1. Wait for Ollama to be ready ──────────────────────────────────────
    info "Waiting for Ollama to be ready..."
    local waited=0
    while [ $waited -lt $MAX_WAIT_SECONDS ]; do
        if check_ollama_ready; then
            ok "Ollama is ready after ${waited}s"
            break
        fi

        if [ $((waited % 10)) -eq 0 ]; then
            info "  Still waiting... (${waited}/${MAX_WAIT_SECONDS}s)"
        fi

        sleep $CHECK_INTERVAL
        waited=$((waited + CHECK_INTERVAL))
    done

    if [ $waited -ge $MAX_WAIT_SECONDS ]; then
        err "Ollama did not become ready within ${MAX_WAIT_SECONDS}s"
        exit 1
    fi

    # ── 2. Check if model already exists ────────────────────────────────────
    info "Checking if model '$MODEL' already exists..."
    if check_model_exists "$MODEL"; then
        ok "Model '$MODEL' already exists"
        echo ""
        echo "✅ Model setup complete"
        exit 0
    fi

    warn "Model '$MODEL' not found"

    # ── 3. Pull the model ───────────────────────────────────────────────────
    info "Starting model pull..."
    echo "Note: This may take several minutes depending on your internet connection."
    echo "Model size: ~1GB"
    echo ""

    if ! pull_model "$MODEL"; then
        err "Failed to pull model '$MODEL'"
        exit 1
    fi

    # ── 4. Verify the model was pulled ──────────────────────────────────────
    info "Verifying model installation..."
    if check_model_exists "$MODEL"; then
        ok "Model '$MODEL' successfully installed"
        echo ""
        echo "✅ Model setup complete"
        exit 0
    else
        err "Model '$MODEL' was not found after pull attempt"
        exit 1
    fi
}

# ── Error handling and execution ──────────────────────────────────────────────
trap 'err "Script interrupted"; exit 1' INT TERM

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
