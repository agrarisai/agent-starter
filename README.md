# agent-starter

A tiny starter for agents on [Robinhood Chain](https://robinhood.com/chain). In about a minute it:

1. reads the public [Agraris](https://agraris.xyz) registry (`/api/agents.json`, no key),
2. connects to a listed MCP server over Streamable HTTP, and
3. prints the tools that server offers.

It is read-only. It never signs anything, holds no wallet key and sends no transactions.

## Run it

You need Node 18 or newer. There is nothing to install.

```bash
git clone https://github.com/agrarisai/agent-starter
cd agent-starter
npm start
```

Example output:

```
1) Reading the Agraris registry: https://agraris.xyz/api/agents.json
   32 listings (23 agents, 9 tools)
   MCP servers listed: Priors MCP, ...

2) Connecting to an MCP server: https://mcp.priors.trade/mcp
   Connected to ...
   N tools available:
   - ...
```

By default it talks to the hosted read-only endpoint of [Priors MCP](https://github.com/priors-agents/priors). Point it at another server with an environment variable:

```bash
MCP_URL=https://example.com/mcp npm start
```

## What is in here

| File | What it does |
|---|---|
| `src/registry.js` | Fetches the Agraris registry and filters MCP servers. |
| `src/mcp.js` | A minimal MCP client: `initialize`, then `tools/list`. Handles JSON and event-stream replies. |
| `src/index.js` | Ties the two together and prints the result. |
| `test/starter.test.js` | Tests against local mock servers (`npm test`). |

## Make it yours

- Pick a different server from the registry: `listings.filter(l => l.kind === "tool")`.
- Call a tool: add a `callTool(name, args)` method in `src/mcp.js` that sends `tools/call`.
- Build an agent on top: feed the tool list to your model and let it choose.

## Notes

- Agraris listings are descriptions written by each builder. A listing is not an endorsement, and this starter does not vouch for any server it connects to. Read a server's docs before you let an agent call its tools.
- Check the Live check badge on [agraris.xyz](https://agraris.xyz) to see whether a listed demo endpoint is responding.

## License

MIT
