#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { checkBrowserHarness } from "./browser-harness-adapter.js";
import { BrowserBridge } from "./browser-bridge.js";
import { ContentStore } from "./content-store.js";
import { indexBookmarksFromFile } from "./index-manager.js";
import { countTree } from "./parser.js";
import { exportBookmarks, mergeBookmarkFiles, readBookmarkFile } from "./index.js";

function usage(): string {
  return `ai-bookmark-mcp commands:\n  merge --out output.html file1.html file2.html\n  export --format json --out out.json input.html\n  index --db db input.html [--limit N] [--fetch-public] [--use-browser]\n  search-index --db db "query"\n  stats input.html\n  tree input.html [--depth N]\n  browser-check [--host localhost] [--port 9222]\n  harness-check`;
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "--help" || cmd === "-h") { console.log(usage()); return; }
  const args = parseArgs(rest);
  switch (cmd) {
    case "merge": {
      const out = requireArg(getString(args.out), "--out");
      const result = mergeBookmarkFiles(args._, out);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "export": {
      const input = requireArg(args._[0], "input.html");
      const out = requireArg(getString(args.out), "--out");
      const format = (getString(args.format) ?? "html") as "html" | "json" | "csv" | "markdown";
      const count = exportBookmarks(input, out, format);
      console.log(`Exported ${count} bookmarks to ${out}`);
      break;
    }
    case "index": {
      const input = requireArg(args._[0], "input.html");
      const db = requireArg(getString(args.db), "--db");
      const result = await indexBookmarksFromFile(input, db, { limit: args.limit ? Number(args.limit) : undefined, fetchPublic: Boolean(args["fetch-public"]), offlineOnly: !args["fetch-public"] && !args["use-browser"], useBrowser: Boolean(args["use-browser"]) });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "search-index": {
      const db = requireArg(getString(args.db), "--db");
      const query = requireArg(args._[0], "query");
      const store = new ContentStore(db);
      try { console.log(JSON.stringify(store.searchFullText(query, { limit: 20 }), null, 2)); }
      finally { store.close(); }
      break;
    }
    case "stats": {
      const input = requireArg(args._[0], "input.html");
      const { links, folders } = readBookmarkFile(input);
      console.log(`Total bookmarks: ${links}\nTotal folders: ${folders}\nFile size: ${fs.statSync(input).size} bytes`);
      break;
    }
    case "tree": {
      const input = requireArg(args._[0], "input.html");
      const maxDepth = args.depth ? Number(args.depth) : 3;
      const { tree } = readBookmarkFile(input);
      const lines: string[] = [];
      renderTree(tree, 0, maxDepth, lines);
      console.log(lines.join("\n"));
      break;
    }
    case "browser-check": {
      const bridge = new BrowserBridge({ host: getString(args.host) ?? "localhost", port: args.port ? Number(args.port) : 9222 });
      console.log(JSON.stringify(await bridge.checkConnection(), null, 2));
      break;
    }
    case "harness-check": {
      console.log(JSON.stringify(checkBrowserHarness(), null, 2));
      break;
    }
    default:
      throw new Error(`Unknown command: ${cmd}\n${usage()}`);
  }
}

function parseArgs(argv: string[]): Record<string, string | boolean | string[]> & { _: string[] } {
  const out: Record<string, string | boolean | string[]> & { _: string[] } = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else { out[key] = next; i += 1; }
    } else out._.push(arg);
  }
  return out;
}

function requireArg<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === "") throw new Error(`Missing required ${name}`);
  return value;
}

function getString(value: string | boolean | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function renderTree(node: ReturnType<typeof readBookmarkFile>["tree"], depth: number, maxDepth: number, out: string[]): void {
  if (depth > maxDepth) return;
  const prefix = "  ".repeat(depth);
  for (const child of node.children) {
    if (child.type !== "folder") continue;
    const counts = countTree(child);
    out.push(`${prefix}${child.title} (${counts.links})`);
    renderTree(child, depth + 1, maxDepth, out);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
}
