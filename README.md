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

## About the creator

TrackTag is built by **[Adi Goldstein](https://adigoldstein.com)** — a composer and music producer based in Tel Aviv who has spent years on both sides of the problem: writing and licensing music, and wrestling with the metadata that makes it findable. TrackTag exists because tagging a catalog by hand is the least musical part of making music.

It's part of a family of tools Adi builds for musicians and creators:

| Project | What it does |
|---|---|
| [TrackTag](https://tracktag.me) | AI music tagging — BPM, key, genres, moods and 35+ metadata fields per track, for catalogs, sync libraries and now AI assistants |
| [AGsoundtrax](https://agsoundtrax.com) | Curated royalty-free music library for filmmakers, video creators and commercial producers |
| [PromoLinks](https://promolinks.me) | Smart links and artist pages for musicians — one URL that routes fans to their preferred streaming platform, with pre-saves and analytics |
| [MakeCanvas](https://makecanvas.me) | AI-generated Spotify Canvas videos — looping visuals for your tracks, no video editing needed |
| [AG Watermark](https://agwatermark.com) | Audio watermarking to protect tracks and demos before they're licensed |

Questions, ideas, or building something with the TrackTag API? Reach out via [tracktag.me/support](https://tracktag.me/support).
