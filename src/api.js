const express = require("express");
const fs = require("fs");
const path = require("path");
const kleur = require("kleur");

const app = express();
const PORT = process.env.PORT || 4000;

const LOG_PATH = path.join(__dirname, "../logs/swap_routes.json");

// Utility: read and parse log
function readRoutes() {
  try {
    const content = fs.readFileSync(LOG_PATH, "utf-8");
    const allEntries = JSON.parse(content);

    // Only return entries from the latest timestamp
    const latestTimestamp = allEntries.reduce((acc, cur) =>
      acc > cur.timestamp ? acc : cur.timestamp
    , "");
    return allEntries.filter(e => e.timestamp === latestTimestamp);
  } catch (err) {
    console.error("[ERROR] Failed to read or parse swap_routes.json");
    return [];
  }
}

// GET /api/routes
app.get("/api/routes", (req, res) => {
  const latestRoutes = readRoutes();
  res.json(latestRoutes);
});

// GET /api/routes/:from/:to
app.get("/api/routes/:from/:to", (req, res) => {
  const { from, to } = req.params;
  const latestRoutes = readRoutes();
  const match = latestRoutes.find(r =>
    r.from.toUpperCase() === from.toUpperCase() &&
    r.to.toUpperCase() === to.toUpperCase()
  );
  if (match) {
    res.json(match);
  } else {
    res.status(404).json({ error: "No route found for this token pair" });
  }
});

app.get("/healthz", (req, res) => {
  const logFile = path.join(__dirname, "../logs/output.log");

  try {
    const logLines = fs.readFileSync(logFile, "utf-8").trim().split("\n");
    const lastLine = logLines.reverse().find(line => line.includes("[heartbeat]"));

    if (!lastLine) {
      return res.status(503).json({ status: "fail", reason: "no heartbeat found" });
    }

    const match = lastLine.match(/\[heartbeat\] (.+)/);
    if (!match) {
      return res.status(503).json({ status: "fail", reason: "malformed heartbeat log" });
    }

    const lastTimestamp = new Date(match[1]);
    const now = new Date();
    const uptimeSeconds = Math.floor((now - lastTimestamp) / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);

    const isHealthy = uptimeSeconds < 10;

    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "ok" : "fail",
      last_heartbeat: lastTimestamp.toISOString(),
      uptime_seconds: uptimeSeconds,
      uptime_minutes: uptimeMinutes,
      reason: isHealthy ? undefined : "heartbeat stale"
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/metrics", (req, res) => {
  const logFile = path.join(__dirname, "../logs/output.log");

  let heartbeatCount = 0;
  let lastTimestamp = null;

  try {
    const lines = fs.readFileSync(logFile, "utf-8")
      .trim()
      .split("\n")
      .filter(line => line.includes("[heartbeat]"));

    heartbeatCount = lines.length;

    if (heartbeatCount > 0) {
      const lastLine = lines[heartbeatCount - 1];
      const match = lastLine.match(/\[heartbeat\] (.+)/);
      if (match) {
        lastTimestamp = new Date(match[1]);
      }
    }

    const now = new Date();
    const secondsSinceLast = lastTimestamp ? Math.floor((now - lastTimestamp) / 1000) : -1;

    // System resource metrics
    const memoryUsage = process.memoryUsage(); // in bytes
    const cpuUsage = process.cpuUsage();       // in microseconds

    res.set("Content-Type", "text/plain");
    res.send(
`# HELP swap_optimizer_heartbeat_count Total number of heartbeats recorded
# TYPE swap_optimizer_heartbeat_count counter
swap_optimizer_heartbeat_count ${heartbeatCount}

# HELP swap_optimizer_last_heartbeat_seconds Seconds since last heartbeat
# TYPE swap_optimizer_last_heartbeat_seconds gauge
swap_optimizer_last_heartbeat_seconds ${secondsSinceLast}

# HELP swap_optimizer_memory_rss_bytes Resident Set Size memory
# TYPE swap_optimizer_memory_rss_bytes gauge
swap_optimizer_memory_rss_bytes ${memoryUsage.rss}

# HELP swap_optimizer_memory_heap_used_bytes Heap memory used
# TYPE swap_optimizer_memory_heap_used_bytes gauge
swap_optimizer_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP swap_optimizer_cpu_user_usec User-space CPU time (microseconds)
# TYPE swap_optimizer_cpu_user_usec counter
swap_optimizer_cpu_user_usec ${cpuUsage.user}

# HELP swap_optimizer_cpu_system_usec Kernel-space CPU time (microseconds)
# TYPE swap_optimizer_cpu_system_usec counter
swap_optimizer_cpu_system_usec ${cpuUsage.system}`
    );
  } catch (err) {
    res.status(500).send(`# ERROR reading logs: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(kleur.green(`[API] Swap route API is running at http://localhost:${PORT}/api/routes`));
});

