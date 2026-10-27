import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchRegistry, mcpServers } from "../src/registry.js";
import { McpClient } from "../src/mcp.js";

function serve(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` })
    );
  });
}

test("fetchRegistry returns listings and mcpServers filters them", async () => {
  const { server, url } = await serve((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        schema_version: 1,
        listings: [
          { kind: "tool", name: "A", category: ["mcp-server"], live_status: "up" },
          { kind: "tool", name: "B", category: ["mcp-server"], live_status: "down" },
          { kind: "agent", name: "C", category: ["trading"] },
          { kind: "tool", name: "D", category: ["data"] },
        ],
      })
    );
  });
  try {
    const listings = await fetchRegistry(url);
    assert.equal(listings.length, 4);
    assert.deepEqual(mcpServers(listings).map((l) => l.name), ["A"]);
  } finally {
    server.close();
  }
});

test("fetchRegistry rejects a bad response", async () => {
  const { server, url } = await serve((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ nope: true }));
  });
  try {
    await assert.rejects(() => fetchRegistry(url), /no listings/);
  } finally {
    server.close();
  }
});

test("McpClient handles JSON replies, a session id and event streams", async () => {
  const seen = [];
  const { server, url } = await serve((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const msg = JSON.parse(body);
      seen.push({ method: msg.method, session: req.headers["mcp-session-id"] || null });
      if (msg.method === "initialize") {
        res.setHeader("content-type", "application/json");
        res.setHeader("mcp-session-id", "abc123");
        res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { serverInfo: { name: "mock" } } }));
      } else if (msg.method === "notifications/initialized") {
        res.statusCode = 202;
        res.end();
      } else if (msg.method === "tools/list") {
        res.setHeader("content-type", "text/event-stream");
        res.end(
          `event: message\ndata: ${JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { tools: [{ name: "get_score", description: "Read a score" }] },
          })}\n\n`
        );
      }
    });
  });
  try {
    const client = new McpClient(url);
    const info = await client.initialize();
    assert.equal(info.serverInfo.name, "mock");
    const tools = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name), ["get_score"]);
    assert.equal(seen[1].session, "abc123");
    assert.equal(seen[2].session, "abc123");
  } finally {
    server.close();
  }
});

test("McpClient surfaces JSON-RPC errors", async () => {
  const { server, url } = await serve((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const msg = JSON.parse(body);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { message: "nope" } }));
    });
  });
  try {
    await assert.rejects(() => new McpClient(url).initialize(), /nope/);
  } finally {
    server.close();
  }
});
