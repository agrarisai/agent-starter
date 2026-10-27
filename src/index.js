import { fetchRegistry, mcpServers, REGISTRY_URL } from "./registry.js";
import { McpClient } from "./mcp.js";

// Hosted, read-only, no key. Override with MCP_URL to try another server.
const DEFAULT_MCP_URL = "https://mcp.priors.trade/mcp";

async function main() {
  const registryUrl = process.env.REGISTRY_URL || REGISTRY_URL;
  const mcpUrl = process.env.MCP_URL || DEFAULT_MCP_URL;

  console.log(`1) Reading the Agraris registry: ${registryUrl}`);
  const listings = await fetchRegistry(registryUrl);
  const agents = listings.filter((l) => l.kind === "agent").length;
  const tools = listings.filter((l) => l.kind === "tool").length;
  console.log(`   ${listings.length} listings (${agents} agents, ${tools} tools)`);

  const servers = mcpServers(listings);
  console.log(`   MCP servers listed: ${servers.map((s) => s.name).join(", ") || "none"}`);

  console.log(`\n2) Connecting to an MCP server: ${mcpUrl}`);
  const client = new McpClient(mcpUrl);
  const info = await client.initialize();
  const name = info && info.serverInfo ? info.serverInfo.name : "server";
  console.log(`   Connected to ${name}`);

  const toolList = await client.listTools();
  console.log(`   ${toolList.length} tools available:`);
  for (const t of toolList) {
    const line = (t.description || "").split("\n")[0].slice(0, 90);
    console.log(`   - ${t.name}${line ? `: ${line}` : ""}`);
  }
  console.log("\nDone. Nothing was signed and no key was used.");
}

main().catch((err) => {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
});
