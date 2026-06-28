#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting background worker..."
python worker.py &

echo "Starting FastAPI server..."
# Check if PORT environment variable is set, default to 8000
PORT="${PORT:-8000}"
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
