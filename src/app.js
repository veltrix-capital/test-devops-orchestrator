require("dotenv").config();
const _ = require("lodash");
const kleur = require("kleur");
const { Graph } = require("graphnetworkx");
const { ethers } = require("ethers");
const fs = require("fs");

const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
const chainlinkFeeds = {
  ETH: { address: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", decimals: 8 },
  USDC: { address: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", decimals: 8 },
  DAI: { address: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9", decimals: 8 },
  LINK: { address: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c", decimals: 8 },
  WBTC: { address: "0xFD858c8bC5ac5e10f01018bC78471bb0DC392247", decimals: 8 },
  UNI: { address: "0x553303d460EE0afB37EdFf9bE42922D8FF63220e", decimals: 8 }
};

const TOKENS = Object.keys(chainlinkFeeds);

// 1. Fetch price from Chainlink
async function getLivePrice(symbol) {
  try {
    const feed = chainlinkFeeds[symbol];
    const contract = new ethers.Contract(feed.address, ["function latestAnswer() view returns (int256)"], provider);
    const raw = await contract.latestAnswer();
    return Number(raw) / 10 ** feed.decimals;
  } catch (err) {
    console.error(kleur.red(`[ERROR] ${symbol} price fetch failed: ${err.message}`));
    return null;
  }
}

// 2. Convert priceA → priceB
async function getLiveRate(from, to) {
  const p1 = await getLivePrice(from);
  const p2 = await getLivePrice(to);
  if (!p1 || !p2) return null;
  return p2 / p1;
}

// 3. Graph builder
async function buildGraph() {
  const tokenPairs = [
    ["ETH", "USDC", 0.003], ["USDC", "DAI", 0.001], ["ETH", "DAI", 0.004],
    ["ETH", "LINK", 0.003], ["LINK", "DAI", 0.002], ["ETH", "WBTC", 0.002],
    ["WBTC", "DAI", 0.003], ["UNI", "DAI", 0.002], ["ETH", "UNI", 0.003]
  ];

  const graph = new Graph({ weighted: true, directed: true });

  for (const [from, to, fee] of tokenPairs) {
    const rate = await getLiveRate(from, to);
    if (rate && rate > 0) {
      graph.setEdge(from, to, -Math.log(rate * (1 - fee)));
    }
  }

  return graph;
}

// 4. Bellman-Ford route finder
function findBestSwapPath(g, fromToken, toToken, amount) {
  const tokens = g.nodes();
  const distances = {};
  const predecessors = {};
  tokens.forEach(token => {
    distances[token] = Infinity;
    predecessors[token] = null;
  });
  distances[fromToken] = 0;

  for (let i = 0; i < tokens.length - 1; i++) {
    for (const { v: from, w: to } of g.edges()) {
      const weight = g.edge(from, to);
      if (distances[from] + weight < distances[to]) {
        distances[to] = distances[from] + weight;
        predecessors[to] = from;
      }
    }
  }

  const path = [];
  let current = toToken;
  while (current) {
    path.unshift(current);
    current = predecessors[current];
  }

  if (path[0] !== fromToken) return { path: [], amount: 0 };
  const outputAmount = amount * Math.exp(-distances[toToken]);
  return { path, amount: outputAmount };
}

// 5. Write all best paths to log file
async function logAllPaths() {
  const g = await buildGraph();
  const entries = [];
  const timestamp = new Date().toISOString();

  for (const from of TOKENS) {
    for (const to of TOKENS) {
      if (from === to) continue;

      const { path, amount } = findBestSwapPath(g, from, to, 1);
      if (path.length > 1) {
        entries.push({
          timestamp,
          from,
          to,
          path,
          output: Number(amount.toFixed(6))
        });
      }
    }
  }

  const logPath = "logs/swap_routes.json";

  let previous = [];
  if (fs.existsSync(logPath)) {
    try {
      const content = fs.readFileSync(logPath, "utf-8");
      previous = JSON.parse(content);
    } catch (err) {
      console.error("[ERROR] Failed to parse existing swap_routes.json:", err.message);
    }
  }

  previous.push(...entries);

  fs.writeFileSync(logPath, JSON.stringify(previous, null, 2));
  console.log(kleur.gray(`[INFO] Logged ${entries.length} swap paths at ${timestamp}`));
}


// 6. Heartbeat logger (silent failure)
function internalLogger() {
  const stream = fs.createWriteStream("logs/output.log", { flags: "a" });
  let counter = 0;
  const interval = setInterval(() => {
    stream.write(`[heartbeat] ${new Date().toISOString()}\n`);
    counter++;
    if (counter >= 6) {
      stream.end(); // silent failure after 30 seconds
      clearInterval(interval);
    }
  }, 5000);
}

function formatDuration(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

// 7. Main entrypoint
async function main() {
  let uptime = 0;
  setInterval(() => {
    uptime += 1;
    const uptimeStr = formatDuration(uptime);
    process.stdout.write(`\r[status] Server running... ${uptimeStr} uptime`);
  }, 1000)
  
  internalLogger();

  const blockNumber = await provider.getBlockNumber();
  console.log(kleur.green(`Connected to Ethereum. Latest block: ${blockNumber}`));

  

  await logAllPaths(); // first run immediately
  setInterval(logAllPaths, 60 * 1000); // repeat every 1 minute
}

main();
