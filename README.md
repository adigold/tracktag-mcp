# TrackTag MCP Server

Let AI agents (Claude Desktop, Claude Code, Cursor, and any MCP-capable client) analyze music with [TrackTag](https://tracktag.me): drop an MP3 into your agent, say *"analyze this track"*, and get BPM, key, genres, moods, instruments, energy and 35+ metadata fields back.

Runs entirely on your own computer — your agent app starts it, talks to it directly (no middleman server, so your audio and API key never leave your machine on the way to TrackTag), and stops it when you quit. Analyses are billed from your TrackTag credit balance (1 credit per track with the `core` model, 2 with `ultra`); failed analyses are refunded automatically.

## Setup

First, get an API key: [tracktag.me/studio](https://tracktag.me/studio) → **API & MCP** → Create key (`tt_live_…`). Free test keys available.

### ⚡ One-click install (Claude Desktop) — recommended

**[Download tracktag.mcpb](https://tracktag.me/downloads/tracktag.mcpb)** → **double-click it** → Claude Desktop opens an install window → paste your API key → done. No config files, no Node.js, nothing to edit. (One Claude quirk: after installing, flip the extension **ON** in Settings → Extensions.)

### Manual config (Cursor, Claude Code, other MCP clients)

Add the server to your agent's MCP config:

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

## Can I analyze multiple tracks? (batching)

**Yes — small batches work right in the chat.** Drop several audio files into your assistant (or name a folder's worth of tracks) and say *"analyze all of these with TrackTag"* — the agent calls the analysis tool once per track and summarizes the results together. Each track bills its own credit, and the default rate limit (10 requests/minute) makes this comfortable for a handful of tracks at a time.

**For real catalog work, use the tools built for it:** [TrackTag Studio](https://tracktag.me/studio) runs 100-file batches with folders, progress tracking and XLSX/CSV/XML exports, and the [TrackTag API](https://tracktag.me/developers) handles high-volume pipelines with async jobs and webhooks. Same engine, same credits — pick the surface that fits the job: MCP for conversation, Studio for catalogs, API for automation.

## "Can't I just drag the MP3 into ChatGPT or Claude and ask?"

**Not if you want real, reliable metadata — and here's the honest breakdown.**

**Claude cannot hear audio, and ChatGPT doesn't musically analyze it.** Drop an MP3 into a Claude chat and it sees the file's *name and metadata* — it never processes the actual sound. ChatGPT will at best transcribe any speech in the file; it won't tell you the key, the groove or the instrumentation from the waveform. Whatever "analysis" comes back is largely an educated guess from the title. This MCP server is what gives your assistant real ears.

**Some models can accept audio — but a raw model is not an analysis product.** TrackTag runs every track through a purpose-built pipeline: audio preprocessing, signal-level analysis of the actual waveform (tempo, tonality, timbre, instrumentation, vocal characteristics, dynamics), an extraction process tuned specifically for music metadata, and validation of every result against a **strict 35+ field taxonomy with controlled vocabulary**. A one-off chat prompt gives you different fields, different wording and different judgments every single run — fine for curiosity, useless for a catalog.

**Consistency is the product.** Sync libraries, marketplaces and labels need the same schema, the same vocabulary and the same standards across 10 or 10,000 tracks — plus batch handling and automatic refunds when an analysis fails. That's engineering around the model, not the model itself, and it's what you're getting here.

Your AI assistant does what it's great at — conversation and workflow. TrackTag does what it's built for — turning sound into professional, uniform metadata.

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
