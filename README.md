# TrackTag MCP Server

Let AI agents (Claude Desktop, Claude Code, Cursor, and any MCP-capable client) analyze music with [TrackTag](https://tracktag.me): drop an MP3 into your agent, say *"analyze this track"*, and get BPM, key, genres, moods, instruments, energy and 35+ metadata fields back.

Runs locally over stdio — nothing is hosted, the server only lives while your agent app is open. Analyses are billed from your TrackTag credit balance (1 credit per track with the `core` model, 2 with `ultra`); failed analyses are refunded automatically.

## Setup

1. Get an API key: [tracktag.me/studio](https://tracktag.me/studio) → **API & MCP** → Create key (`tt_live_…`).
2. Add the server to your agent's MCP config:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tracktag": {
      "command": "npx",
      "args": ["-y", "tracktag-mcp"],
      "env": { "TRACKTAG_API_KEY": "tt_live_YOUR_KEY" }
    }
  }
}
```

**Claude Code**:

```bash
claude mcp add tracktag -e TRACKTAG_API_KEY=tt_live_YOUR_KEY -- npx -y tracktag-mcp
```

**Cursor** (`~/.cursor/mcp.json`): same JSON block as Claude Desktop.

## Tools

| Tool | What it does | Cost |
|---|---|---|
| `analyze_track` | Analyze a local audio file (mp3/wav/flac/aiff/m4a/ogg, ≤15 MB) | 1–2 credits |
| `analyze_url` | Analyze audio from any https URL (≤60 MB) | 1–2 credits |
| `get_credits` | Remaining credit balance and limits | free |
| `list_recent_jobs` | Recent API analyses | free |

## Docs

Full API reference: [tracktag.me/developers](https://tracktag.me/developers)
