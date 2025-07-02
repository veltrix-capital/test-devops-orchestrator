#!/bin/bash

echo "[Swap Optimizer] Starting the path-finder service..."

# Ensure .env exists
if [ ! -f .env ]; then
    echo "[ERROR] Missing .env file. Please run setup.sh first."
    exit 1
fi

# Run orchestrator logic
echo "[Swap Optimizer] Starting orchestrator..."
node src/app.js &

# Run API server logic
echo "[Swap Optimizer] Starting API server..."
node src/api.js &

# Simulate silent failure after 5 minutes
(
  sleep 300
  pkill -f "node src/app.js"
  echo "[SWAP OPTIMIZER] Simulated crash: app.js stopped after 5 minutes." >> logs/output.log
) &

wait
