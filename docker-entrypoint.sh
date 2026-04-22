#!/bin/bash
set -e

echo "=========================================="
echo " Chesapeake City Agentic AI Chatbot"
echo "=========================================="
echo " Environment: ${NODE_ENV:-production}"
echo " Version: 1.0.0"
echo "=========================================="

# Create necessary directories
echo "Creating directories..."
mkdir -p /app/data
mkdir -p /app/data/ingestion
mkdir -p /app/data/vector_store

# Set permissions
chown -R nextjs:nodejs /app/data || true

# Check if we need to ingest data
if [[ "${RUN_DATA_INGESTION:-false}" == "true" ]]; then
    echo "Running data ingestion pipeline..."

    # Check if we have API keys
    if [[ -z "${LLM_API_KEY}" ]]; then
        echo "WARNING: LLM_API_KEY not set. Data ingestion may fail."
    fi

    # Run ingestion script
    cd /app
    SKIP_FLAG=""
    if [[ "${INGESTION_SKIP_EMBEDDING}" == "true" ]]; then
        SKIP_FLAG="--skip-embedding"
    fi
    npm run ingest -- \
        --max-pages "${INGESTION_MAX_PAGES:-30}" \
        --max-depth "${INGESTION_MAX_DEPTH:-2}" \
        --chunk-size "${INGESTION_CHUNK_SIZE:-512}" \
        --chunk-overlap "${INGESTION_CHUNK_OVERLAP:-50}" \
        ${SKIP_FLAG} --verbose "${INGESTION_VERBOSE:-false}" || {
        echo "WARNING: Data ingestion failed or partially succeeded. Continuing..."
    }

    echo "Data ingestion completed."
else
    echo "Skipping data ingestion (RUN_DATA_INGESTION not set to 'true')"
fi

# Check if vector database exists
if [[ ! -f "/app/data/vector_store.db" ]]; then
    echo "WARNING: Vector database not found at /app/data/vector_store.db"
    echo "The chatbot will start but may not have knowledge base data."
    echo "Set RUN_DATA_INGESTION=true to scrape and embed website content."
fi

# Health check function
health_check() {
    echo "Performing health check..."
    timeout 10s bash -c 'until curl -f http://localhost:3000/api/chat >/dev/null 2>&1; do
        sleep 1
    done'

    if [ $? -eq 0 ]; then
        echo "✅ Application is healthy"
        return 0
    else
        echo "❌ Application health check failed"
        return 1
    fi
}

# Trap signals for graceful shutdown
cleanup() {
    echo "Received shutdown signal. Cleaning up..."
    kill -TERM "$PID" 2>/dev/null
    wait "$PID"
    echo "Application stopped gracefully."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the application
echo "Starting Chesapeake City Agentic AI Chatbot..."
cd /app

# Run in background to allow signal trapping
npm start &
PID=$!

# Wait for application to start
echo "Waiting for application to start (max 60 seconds)..."
for i in {1..60}; do
    if curl -s http://localhost:3000/api/chat >/dev/null 2>&1; then
        echo "✅ Application started successfully!"

        # Perform detailed health check
        if health_check; then
            echo "=========================================="
            echo " Application Information:"
            echo "=========================================="
            echo " URL: http://localhost:3000"
            echo " API: http://localhost:3000/api/chat"
            echo " Health: http://localhost:3000/api/chat (GET)"
            echo "=========================================="

            # Print startup logs if verbose
            if [[ "${VERBOSE_STARTUP:-false}" == "true" ]]; then
                echo "Environment variables summary:"
                echo "  NODE_ENV: ${NODE_ENV}"
                echo "  LLM_PROVIDER: ${LLM_PROVIDER:-deepseek}"
                echo "  VECTOR_STORE_PROVIDER: ${VECTOR_STORE_PROVIDER:-sqlite}"
                echo "  DATABASE_URL: ${DATABASE_URL:-sqlite://./data/vector_store.db}"
            fi
        fi

        # Wait for process
        wait "$PID"
        exit $?
    fi
    sleep 1
done

echo "❌ Application failed to start within 60 seconds"
echo "Last 20 lines of logs:"
tail -20 /proc/$PID/fd/1 2>/dev/null || echo "Could not read logs"
kill -TERM "$PID" 2>/dev/null
wait "$PID"
exit 1
