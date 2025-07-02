# Swap Optimizer – DevOps Candidate Challenge

Welcome! This project is a real-world simulation of a token swap optimizer using live Chainlink price feeds on Ethereum mainnet. It includes both a backend orchestrator and a lightweight API layer. Your role is to run, debug, and improve the system as a DevOps engineer.

---

## 🚀 Project Overview

This app continuously:
- Connects to Ethereum via Infura
- Fetches token prices from Chainlink
- Calculates optimal token swap paths
- Logs all swap paths to `logs/swap_routes.json`
- Emits uptime and heartbeat logs to `logs/output.log`

A REST API (`api.js`) exposes:
- `/api/routes`: Latest swap paths
- `/api/routes/:from/:to`: Single pair lookup
- `/healthz`: System heartbeat check based on logs
- `/metrics`: Prometheus-style metrics (uptime, memory, CPU)

---

## 🧩 Your Tasks

### 1. Setup and Launch

Run the app using the provided scripts:

```bash
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

Ensure you configure `.env` from `.env_example` with your Infura Project ID.

### 2. Observe the Logs

Monitor live status:

```bash
tail -f logs/output.log
tail -f logs/swap_routes.json
```

Also visit:

- http://localhost:4000/api/routes
- http://localhost:4000/healthz
- http://localhost:4000/metrics

### 3. Debug: Silent Failure Simulation

After 30 seconds, `output.log` will stop updating — without crashing the app. Your job:

- Identify and fix the root cause of this silent failure
- Make heartbeat logs reliable again

### 4. Improve Shell Scripts

Refactor and harden:

- `setup.sh`: Validate environment, improve logging
- `start.sh`: Add safety features, background tasks, or monitoring

### 5. Containerize the Application

- Create a `Dockerfile` to run `app.js` and `api.js`
- Optional: Add `docker-compose.yml` for easier orchestration
- Ensure logs persist and `.env` can be injected cleanly

### 6. Bonus (Optional)

You may optionally:

- Build a log monitoring watchdog (bash or node)
- Add `logrotate` or timestamp-based log separation
- Serve a `/status.html` page from the API with live stats

---

## 🧪 Functional Endpoints

| Endpoint                  | Description                                 |
|---------------------------|---------------------------------------------|
| `/api/routes`             | All recent swap paths                       |
| `/api/routes/:from/:to`   | One specific token pair                     |
| `/healthz`                | Uptime check (based on heartbeat log)       |
| `/metrics`                | Prometheus metrics (uptime, memory, CPU)    |

---

## 🛠 Project Structure

```
eth-swap-devops-challenge/
├── setup.sh           # Setup script
├── start.sh           # Starts app.js and api.js
├── .env_example       # Set your INFURA_URL here
├── package.json
├── logs/
│   ├── output.log         # Heartbeat logs (every 5s)
│   └── swap_routes.json   # Swap route logs (every 1m)
└── src/
    ├── app.js         # Orchestrator – fetches and logs paths
    └── api.js         # REST API and health endpoints
```

---

## ✅ Requirements

- Node.js 16+
- Bash (for script execution)
- Infura project ID for Ethereum Mainnet (free to register at https://infura.io)

---

## 🔍 Evaluation Criteria

| Category        | Expectations                                  |
|----------------|-----------------------------------------------|
| **Reliability** | Can you make the service stable?             |
| **Observability** | Do you improve logs, health, metrics?       |
| **Shell Scripting** | Are scripts clean, safe, readable?        |
| **Containerization** | Do you build a usable Docker setup?      |
| **Problem Solving** | Can you debug a hidden runtime issue?     |

---

Good luck! Feel free to make suggestions beyond the requirements — we value initiative and clear thinking.
