#!/usr/bin/env bash
# =============================================================================
# Chesapeake City Chatbot — Ollama Entrypoint with Model Auto-Pull
# =============================================================================
# This script extends the official Ollama entrypoint to automatically
# pull the required embedding model on first startup.
#
# Environment variables:
#   EMBEDDING_MODEL    — Model to pull (default: "qwen2.5:1.5b")
#   OLLAMA_MODEL       — Alternative variable for model name
#   SKIP_MODEL_PULL    — Set to "true" to skip auto-pull
#   MAX_WAIT_SECONDS   — Max seconds to wait for Ollama (default: 120)
#
# The script will:
# 1. Start Ollama serve in background
# 2. Wait for Ollama to be ready
# 3. Check if required model exists
# 4. Pull it if missing (unless SKIP_MODEL_PULL=true)
# 5. Bring Ollama to foreground
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
# Model to pull (can be overridden by environment variables)
MODEL="${EMBEDDING_MODEL:-${OLLAMA_MODEL:-qwen2.5:1.5b}}"
SKIP_PULL="${SKIP_MODEL_PULL:-false}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-120}"
CHECK_INTERVAL=2

# Original Ollama command (default to serve if not specified)
ORIGINAL_CMD="${@:-/bin/ollama serve}"

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
    info "Note: This may take several minutes depending on internet connection."
    info "Model size: ~1GB"

    # Run pull with timeout and capture output
    if timeout 300 ollama pull "$model"; then
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            warn "Model pull timed out after 5 minutes"
            warn "Model may still be downloading in background"
            return 0  # Continue anyway
        else
            return 1
        fi
    fi
}

# Wait for Ollama to become ready
wait_for_ollama() {
    info "Waiting for Ollama to be ready..."
    local waited=0

    while [ $waited -lt $MAX_WAIT_SECONDS ]; do
        if check_ollama_ready; then
            ok "Ollama is ready after ${waited}s"
            return 0
        fi

        # Show progress every 10 seconds
        if [ $((waited % 10)) -eq 0 ]; then
            info "  Still waiting... (${waited}/${MAX_WAIT_SECONDS}s)"
        fi

        sleep $CHECK_INTERVAL
        waited=$((waited + CHECK_INTERVAL))
    done

    err "Ollama did not become ready within ${MAX_WAIT_SECONDS}s"
    return 1
}

# Setup model (check and pull if needed)
setup_model() {
    local model="$1"

    info "Checking if model '$model' already exists..."
    if check_model_exists "$model"; then
        ok "Model '$model' already exists"
        return 0
    fi

    warn "Model '$model' not found"

    if [ "$SKIP_PULL" = "true" ]; then
        warn "Skipping model pull (SKIP_MODEL_PULL=true)"
        warn "Chatbot embeddings will fail until model is manually pulled"
        return 0
    fi

    # Pull the model
    if pull_model "$model"; then
        # Verify pull was successful
        if check_model_exists "$model"; then
            ok "Model '$model' successfully installed"
            return 0
        else
            warn "Model '$model' not found after pull attempt"
            warn "It may still be downloading. Manual check recommended:"
            warn "  docker exec $(hostname) ollama list"
            return 0  # Continue anyway
        fi
    else
        err "Failed to pull model '$model'"
        return 1
    fi
}

# ── Main entrypoint logic ─────────────────────────────────────────────────────
main() {
    echo ""
    echo "=============================================="
    echo "  Chesapeake Chatbot — Ollama Entrypoint"
    echo "=============================================="
    echo ""
    info "Model: $MODEL"
    info "Command: $ORIGINAL_CMD"
    echo ""

    # ── 1. Start Ollama in background ──────────────────────────────────────
    info "Starting Ollama..."
    eval "$ORIGINAL_CMD" &
    local ollama_pid=$!

    # Trap signals to properly kill Ollama
    trap "kill -TERM $ollama_pid; wait $ollama_pid" TERM INT

    # ── 2. Wait for Ollama to be ready ─────────────────────────────────────
    if ! wait_for_ollama; then
        err "Failed to start Ollama"
        kill -TERM $ollama_pid 2>/dev/null || true
        exit 1
    fi

    # ── 3. Setup required model ────────────────────────────────────────────
    if ! setup_model "$MODEL"; then
        warn "Model setup had issues, but continuing..."
    fi

    # ── 4. Log success and bring Ollama to foreground ──────────────────────
    echo ""
    ok "Ollama setup complete"
    ok "Model '$MODEL' is available for embeddings"
    echo ""
    info "Ollama is running on: 0.0.0.0:11434"
    info "Health check: curl http://localhost:11434/api/tags"
    echo "=============================================="
    echo ""

    # Wait for Ollama process (bring to foreground)
    wait $ollama_pid
    local exit_code=$?

    info "Ollama process exited with code: $exit_code"
    exit $exit_code
}

# ── Error handling and execution ──────────────────────────────────────────────
trap 'err "Entrypoint interrupted"; exit 1' INT TERM

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
