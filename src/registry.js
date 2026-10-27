// Reads the public Agraris registry (a static JSON file, no key needed).
export const REGISTRY_URL = "https://agraris.xyz/api/agents.json";

export async function fetchRegistry(url = REGISTRY_URL, fetchImpl = fetch) {
  const res = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Registry request failed: HTTP ${res.status}`);
  const doc = await res.json();
  if (!doc || !Array.isArray(doc.listings)) {
    throw new Error("Registry response has no listings array");
  }
  return doc.listings;
}

// Listings that look like MCP servers and are not marked down by Live check.
export function mcpServers(listings) {
  return listings.filter(
    (l) =>
      l.kind === "tool" &&
      Array.isArray(l.category) &&
      l.category.includes("mcp-server") &&
      l.live_status !== "down"
  );
}
