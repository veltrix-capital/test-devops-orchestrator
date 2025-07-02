#!/bin/bash

echo "[Swap Optimizer Setup] Starting setup..."

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Please install Node.js >= 16."
    exit 1
fi

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm not found. Please install npm."
    exit 1
fi

# Prepare logs directory
mkdir -p logs

# Install dependencies
echo "[INFO] Installing Node.js dependencies..."
npm install

# Prepare .env file
if [ ! -f .env ]; then
    if [ -f .env_example ]; then
        cp .env_example .env
        echo "[INFO] Copied .env_example to .env"
        echo "[WARN] Update your INFURA_URL in .env before proceeding."
    else
        echo "[ERROR] No .env or .env_example found. Cannot continue."
        exit 1
    fi
fi

echo "[Swap Optimizer Setup] Setup complete."
