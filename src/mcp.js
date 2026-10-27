// A very small MCP client for "Streamable HTTP" servers (JSON-RPC over POST).
// It only does what a starter needs: initialize, then list tools.
// Read-only: it never calls a tool, signs anything or needs a key.

const PROTOCOL_VERSION = "2025-03-26";

// A server may answer with plain JSON or with a one-message event stream.
async function readRpcResponse(res) {
  const type = res.headers.get("content-type") || "";
  const text = await res.text();
  if (type.includes("text/event-stream")) {
    const dataLines = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    for (const line of dataLines) {
      try {
        const msg = JSON.parse(line);
        if (msg && (msg.result !== undefined || msg.error !== undefined)) return msg;
      } catch {
        // ignore non-JSON data lines
      }
    }
    throw new Error("Event stream had no JSON-RPC response");
  }
  return JSON.parse(text);
}

export class McpClient {
  constructor(url, fetchImpl = fetch) {
    this.url = url;
    this.fetch = fetchImpl;
    this.sessionId = null;
    this.nextId = 1;
  }

  async #post(body) {
    const headers = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    const res = await this.fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) this.sessionId = sid;
    return res;
  }

  async #request(method, params = {}) {
    const res = await this.#post({ jsonrpc: "2.0", id: this.nextId++, method, params });
    if (!res.ok) throw new Error(`${method} failed: HTTP ${res.status}`);
    const msg = await readRpcResponse(res);
    if (msg.error) throw new Error(`${method} error: ${msg.error.message || "unknown"}`);
    return msg.result;
  }

  async initialize() {
    const result = await this.#request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "agraris-agent-starter", version: "0.1.0" },
    });
    // Tell the server we are ready. No response is expected.
    await this.#post({ jsonrpc: "2.0", method: "notifications/initialized" });
    return result;
  }

  async listTools() {
    const result = await this.#request("tools/list");
    return Array.isArray(result.tools) ? result.tools : [];
  }
}
