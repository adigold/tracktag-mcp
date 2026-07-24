#!/usr/bin/env node
// TrackTag MCP server — exposes the TrackTag audio-analysis API as MCP tools
// so AI agents (Claude Desktop/Code, Cursor, …) can analyze music files.
//
// Config (in the agent's MCP settings):
//   { "command": "npx", "args": ["-y", "tracktag-mcp"],
//     "env": { "TRACKTAG_API_KEY": "tt_live_..." } }
//
// Runs on the user's machine over stdio; only alive while the agent app is.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, basename, join } from "node:path";
import { homedir } from "node:os";

const API_BASE = process.env.TRACKTAG_API_BASE ?? "https://aaeabanvqnndwgrqsmhg.supabase.co/functions/v1/api-v1";
const API_KEY = process.env.TRACKTAG_API_KEY;

const MAX_INLINE_BYTES = 15 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".flac": "audio/flac",
  ".aiff": "audio/aiff", ".aif": "audio/aiff", ".m4a": "audio/mp4",
  ".mp4": "audio/mp4", ".ogg": "audio/ogg", ".webm": "audio/webm",
};

function requireKey(): string {
  if (!API_KEY) {
    throw new Error(
      "TRACKTAG_API_KEY is not set. Add it to this MCP server's env config — create a key at https://tracktag.me/studio (API & MCP tab).",
    );
  }
  return API_KEY;
}

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.error?.code ?? `http_${res.status}`;
    const msg = data?.error?.message ?? "Unknown error";
    if (res.status === 402) throw new Error(`Out of TrackTag credits — top up at https://tracktag.me/topup and retry. (${msg})`);
    if (res.status === 429) throw new Error(`TrackTag rate limit reached — wait ${res.headers.get("Retry-After") ?? "60"}s and retry. (${msg})`);
    if (res.status === 401) throw new Error(`TrackTag API key rejected — check TRACKTAG_API_KEY. (${msg})`);
    throw new Error(`TrackTag API error ${code}: ${msg}`);
  }
  return data;
}

function summarize(job: any): string {
  // Return raw JSON for the agent plus a compact human header. Agents render
  // the JSON however fits the conversation; the header covers the highlights.
  const t = job?.result?.tags ?? {};
  const head = [
    job?.track_name ? `Track: ${job.track_name}` : null,
    t.bpm ? `BPM ${t.bpm}` : null,
    t.key ? `Key ${t.key} ${t.mode ?? ""}`.trim() : null,
    Array.isArray(t.genres) ? `Genres: ${t.genres.slice(0, 3).join(", ")}` : null,
    typeof t.energy === "number" ? `Energy ${t.energy}` : null,
    `Credits charged: ${job?.credits_charged ?? "?"}`,
  ].filter(Boolean).join(" · ");
  return `${head}\n\nFull analysis JSON:\n${JSON.stringify(job?.result ?? job, null, 2)}`;
}

// Recursively scan common folders for audio files matching a query. Depth- and
// count-limited so a huge Music library can't hang the tool.
const AUDIO_EXTS = new Set(Object.keys(MIME_BY_EXT));

async function scanForAudio(dir: string, query: string, depth: number, hits: { path: string; size: number; mtime: Date }[]): Promise<void> {
  if (depth < 0 || hits.length >= 25) return;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (hits.length >= 25) return;
    if (e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await scanForAudio(full, query, depth - 1, hits);
    } else if (AUDIO_EXTS.has(extname(e.name).toLowerCase()) && e.name.toLowerCase().includes(query)) {
      try {
        const s = await stat(full);
        hits.push({ path: full, size: s.size, mtime: s.mtime });
      } catch { /* unreadable — skip */ }
    }
  }
}

const server = new McpServer({ name: "tracktag", version: "0.2.0" });

server.tool(
  "find_audio_files",
  "Find audio files on this machine by (partial) name — searches Downloads, Desktop, Music and Documents. Use this to resolve a file path when the user mentions a track by name (e.g. after dragging a file into chat, which does not reveal its local path). Free.",
  {
    query: z.string().min(1).describe("Part of the file name, case-insensitive (e.g. 'sunset drive')"),
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const home = homedir();
    const hits: { path: string; size: number; mtime: Date }[] = [];
    for (const folder of ["Downloads", "Desktop", "Music", "Documents"]) {
      await scanForAudio(join(home, folder), q, 3, hits);
    }
    hits.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const text = hits.length
      ? hits.map((h) => `${h.path}  (${(h.size / 1024 / 1024).toFixed(1)} MB, modified ${h.mtime.toISOString().slice(0, 10)})`).join("\n")
      : `No audio files matching "${query}" in Downloads/Desktop/Music/Documents. Ask the user for the full path (Finder: right-click the file, hold Option, "Copy … as Pathname").`;
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "analyze_track",
  "Analyze a LOCAL audio file (mp3/wav/flac/aiff/m4a/ogg, up to 15 MB) with TrackTag AI. Returns BPM, key, genres, moods, instruments, energy and 35+ metadata fields. Costs 1 TrackTag credit (model 'core') or 2 ('ultra') from the user's balance; failed analyses are auto-refunded. Needs the file's real path on this machine — if you only know the track's name (e.g. the user dragged a file into chat), call find_audio_files first. For files over 15 MB or already-hosted audio, use analyze_url.",
  {
    file_path: z.string().describe("Absolute path to the audio file on this machine"),
    model: z.enum(["core", "ultra"]).default("core").describe("core = 1 credit, ultra = 2 credits (deeper analysis)"),
    track_name: z.string().optional().describe("Display name; defaults to the file name"),
  },
  async ({ file_path, model, track_name }) => {
    const info = await stat(file_path).catch(() => null);
    if (!info?.isFile()) throw new Error(`File not found: ${file_path}`);
    if (info.size > MAX_INLINE_BYTES) {
      throw new Error(`File is ${(info.size / 1024 / 1024).toFixed(1)} MB — over the 15 MB inline limit. Host it (S3/CDN/temporary link) and use analyze_url instead.`);
    }
    const mime = MIME_BY_EXT[extname(file_path).toLowerCase()];
    if (!mime) throw new Error(`Unsupported extension "${extname(file_path)}". Supported: mp3, wav, flac, aiff, m4a, ogg.`);
    const audio_b64 = (await readFile(file_path)).toString("base64");
    const job = await api("/v1/analyze?wait=true", {
      method: "POST",
      body: JSON.stringify({ audio_b64, mime, model, track_name: track_name ?? basename(file_path) }),
    });
    return { content: [{ type: "text", text: summarize(job) }] };
  },
);

server.tool(
  "analyze_url",
  "Analyze audio from a URL (any public or signed https link, up to 60 MB) with TrackTag AI. Same output and credit cost as analyze_track.",
  {
    audio_url: z.string().url().describe("Direct link to the audio file"),
    model: z.enum(["core", "ultra"]).default("core"),
    track_name: z.string().optional(),
  },
  async ({ audio_url, model, track_name }) => {
    const job = await api("/v1/analyze?wait=true", {
      method: "POST",
      body: JSON.stringify({ audio_url, model, track_name }),
    });
    return { content: [{ type: "text", text: summarize(job) }] };
  },
);

server.tool(
  "get_credits",
  "Get the user's remaining TrackTag credit balance and API limits. Free.",
  {},
  async () => {
    const acc = await api("/v1/account");
    return {
      content: [{
        type: "text",
        text: `TrackTag credits remaining: ${acc.credits_remaining} (key "${acc.key_label}", ${acc.rpm_limit}/min, ${acc.daily_limit}/day). Top up: ${acc.top_up_url}`,
      }],
    };
  },
);

server.tool(
  "list_recent_jobs",
  "List the user's recent TrackTag API analyses (id, status, track, credits). Free.",
  {
    limit: z.number().int().min(1).max(50).default(10),
  },
  async ({ limit }) => {
    const list = await api(`/v1/jobs?limit=${limit}`);
    const rows = (list.data ?? []).map((j: any) =>
      `${j.created_at}  ${j.status.padEnd(10)}  ${j.model}  ${j.credits_charged}cr  ${j.track_name ?? j.id}`,
    );
    return { content: [{ type: "text", text: rows.length ? rows.join("\n") : "No API analyses yet." }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("TrackTag MCP server running (stdio). Docs: https://tracktag.me/developers");
